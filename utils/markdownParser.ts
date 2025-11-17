export function renderMarkdown(text: string): string {
    if (!text) return '';

    // Process code blocks first to prevent inner content from being parsed
    const codeBlocks: string[] = [];
    text = text.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
        const placeholder = `__CODEBLOCK_${codeBlocks.length}__`;
        codeBlocks.push(`<pre><code class="block text-sm p-2 rounded-md bg-gray-900/70 border border-gray-700 overflow-x-auto">${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`);
        return placeholder;
    });

    let html = text
        // Escape HTML to prevent injection from non-code parts
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        // Bold (**text** or __text__)
        .replace(/\*\*(.*?)\*\*|__(.*?)__/g, '<strong>$1$2</strong>')
        // Italics (*text* or _text_)
        .replace(/\*(.*?)\*|_(.*?)_/g, '<em>$1$2</em>')
        // Strikethrough (~~text~~)
        .replace(/~~(.*?)~~/g, '<del>$1</del>')
        // Inline code (`code`)
        .replace(/`([^`]+)`/g, '<code class="bg-gray-700/50 text-cyan-300 text-sm rounded px-1.5 py-0.5 font-mono">$1</code>')
        // Newlines to <br>
        .replace(/\n/g, '<br />');

    // Restore code blocks
    codeBlocks.forEach((block, index) => {
        html = html.replace(`__CODEBLOCK_${index}__`, block);
    });

    return html;
}
