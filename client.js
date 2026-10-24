window.__ModuleLoader__.load({
  id: 'dsh-prompt-polish',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useRef, useState } = React
    const STYLE_ID = 'dsh-prompt-polish-style'

    function installStyle() {
      if (document.getElementById(STYLE_ID)) return
      const style = document.createElement('style')
      style.id = STYLE_ID
      // Colours come only from the harness design tokens (--dsw-alias-*), each of
      // which carries a light and a dark value. The previous fallbacks (#fff /
      // #333) were never overridden by a token, so the button stayed a white slab
      // in dark mode. Canvas/CanvasText are the last-resort fallbacks and follow
      // the system colour scheme too.
      style.textContent = `
        .dsh-prompt-polish-button{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 10px;border:1px solid var(--dsw-alias-border-l2,color-mix(in srgb,CanvasText 18%,transparent));border-radius:var(--dsw-radius-sm,8px);background:var(--dsw-alias-bg-layer-2,Canvas);color:var(--dsw-alias-label-primary,CanvasText);font:inherit;font-size:12px;cursor:pointer;white-space:nowrap;transition:background-color .15s ease,opacity .15s ease}
        .dsh-prompt-polish-button:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,color-mix(in srgb,CanvasText 8%,transparent))}
        .dsh-prompt-polish-button:active:not(:disabled){background:var(--dsw-alias-interactive-bg-active,color-mix(in srgb,CanvasText 12%,transparent))}
        .dsh-prompt-polish-button:disabled{opacity:.5;cursor:not-allowed}
        .dsh-prompt-polish-button:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,CanvasText);outline-offset:2px}
        .dsh-prompt-polish-backdrop{position:fixed;inset:0;z-index:2000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.45);padding:24px}
        .dsh-prompt-polish-dialog{width:min(440px,88vw);padding:18px 18px 14px;border-radius:var(--dsw-radius-md,12px);border:1px solid var(--dsw-alias-border-l2,color-mix(in srgb,CanvasText 18%,transparent));background:var(--dsw-alias-bg-layer-1,Canvas);color:var(--dsw-alias-label-primary,CanvasText);box-shadow:0 18px 40px rgba(0,0,0,.35);font-size:13px;line-height:1.6}
        .dsh-prompt-polish-dialog-title{display:flex;align-items:center;gap:8px;margin:0 0 8px;font-size:15px;font-weight:600}
        .dsh-prompt-polish-dialog-body{margin:0 0 14px;color:var(--dsw-alias-label-secondary,CanvasText);word-break:break-word}
        .dsh-prompt-polish-dialog-actions{display:flex;justify-content:flex-end;gap:8px}
        .dsh-prompt-polish-dialog-ok{height:30px;padding:0 16px;border:1px solid transparent;border-radius:var(--dsw-radius-sm,8px);background:var(--dsw-alias-brand-primary,CanvasText);color:var(--dsw-alias-bg-layer-1,Canvas);font:inherit;font-size:12px;cursor:pointer}
        .dsh-prompt-polish-dialog-ok:hover{opacity:.88}
        .dsh-prompt-polish-dialog-ok:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,CanvasText);outline-offset:2px}
      `
      document.head.appendChild(style)
    }

    function PromptPolishButton({ locked, useInput, inputActions }) {
      const input = useInput(state => state)
      const latestDraft = useRef(input.draft)
      latestDraft.current = input.draft
      const [busy, setBusy] = useState(false)
      const [backup, setBackup] = useState(null)
      const [balanceNotice, setBalanceNotice] = useState('')
      const hasAttachments = input.attachmentIds.length > 0
      // Images and files no longer block polishing: only the text draft is
      // rewritten, and every attachment stays attached to the composer message.
      // Reference/command chips still block, because replacing the whole draft
      // would drop their occurrence anchors.
      const canUse = !locked && input.phase === 'plain' && input.draft.trim().length > 0 && input.occurrences.length === 0

      // No progress or result overlay: the draft itself is the feedback, and the
      // button turns into "撤销". Failures are reported to the browser console only,
      // except an exhausted balance, which still raises its own dialog.
      async function optimize() {
        const original = input.draft
        if (!canUse || busy || latestDraft.current !== original) return
        setBusy(true)
        try {
          const response = await fetch('/api/dsh-prompt-polish', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ draft: original }),
          })
          const result = await response.json()
          if (!response.ok) {
            if (response.status === 402 || result?.code === 'INSUFFICIENT_BALANCE') {
              setBalanceNotice(result?.error || '账户余额不足，暂时无法优化提示词。')
              return
            }
            throw new Error(result?.error || '优化失败。')
          }
          if (latestDraft.current !== original) {
            console.warn('[dsh-prompt-polish] 草稿在优化期间有变化，结果未覆盖。')
            return
          }
          setBackup({ original, optimized: result.optimized })
          inputActions.setDraft(result.optimized)
        } catch (error) {
          console.warn('[dsh-prompt-polish] 优化失败：', error?.message || error)
        } finally {
          setBusy(false)
        }
      }

      function undo() {
        if (!backup) return
        if (latestDraft.current !== backup.optimized) {
          console.warn('[dsh-prompt-polish] 当前草稿已有改动，未恢复旧版本。')
          setBackup(null)
          return
        }
        inputActions.setDraft(backup.original)
        setBackup(null)
      }

      function describeTitle() {
        if (input.occurrences.length > 0) return '暂不支持带引用或命令标记的草稿'
        if (busy) return '正在优化…'
        if (!canUse) return '先输入一段提示词草稿'
        if (hasAttachments) return '只优化文字部分，图片与附件保持原样、不参与改写'
        return '用已配置模型优化当前草稿'
      }

      installStyle()
      return h(React.Fragment, null,
        h('button', {
          type: 'button',
          className: 'dsh-prompt-polish-button',
          disabled: !backup && (!canUse || busy),
          onClick: backup ? undo : optimize,
          title: describeTitle(),
          'aria-label': backup ? '撤销提示词优化' : '优化提示词',
          'aria-busy': busy,
        }, backup ? '↶ 撤销' : busy ? '优化中…' : '✦ 优化提示词'),
        balanceNotice
          ? h('div', {
            className: 'dsh-prompt-polish-backdrop',
            role: 'presentation',
            onClick: () => setBalanceNotice(''),
          }, h('div', {
            className: 'dsh-prompt-polish-dialog',
            role: 'alertdialog',
            'aria-modal': 'true',
            'aria-label': '余额不足',
            onClick: event => event.stopPropagation(),
          },
          h('div', { className: 'dsh-prompt-polish-dialog-title' }, '⚠ 余额不足'),
          h('div', { className: 'dsh-prompt-polish-dialog-body' }, balanceNotice),
          h('div', { className: 'dsh-prompt-polish-dialog-actions' },
            h('button', {
              type: 'button',
              className: 'dsh-prompt-polish-dialog-ok',
              onClick: () => setBalanceNotice(''),
              autoFocus: true,
            }, '知道了'),
          ),
          ))
          : null,
      )
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('conversation.input.right', () =>
          ctx.slots.register({ name: 'conversation.input.right', id: 'dsh-prompt-polish', order: 80 }, PromptPolishButton),
        )
      },
    }
  },
})
