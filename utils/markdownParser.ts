export function renderMarkdown(text: string): string {
    if (!text) return '';

    // Process code blocks first to prevent inner content from being parsed
    const codeBlocks: string[] = [];
    text = text.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
        const placeholder = `__CODEBLOCK_${codeBlocks.length}__`;
        const escapedCode = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        codeBlocks.push(`<pre><code class="block text-sm p-2 rounded-md bg-gray-900/70 border border-gray-700 overflow-x-auto">${escapedCode}</code></pre>`);
        return placeholder;
    });

    let html = text
        // Escape HTML to prevent injection from non-code parts
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        // Headers
        .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-2">$1</h3>')
        .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-3 border-b border-gray-600 pb-1">$1</h2>')
        .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-extrabold mt-4 border-b-2 border-gray-500 pb-2">$1</h1>')
        // Bold (**text** or __text__)
        .replace(/\*\*(.*?)\*\*|__(.*?)__/g, '<strong>$1$2</strong>')
        // Italics (*text* or _text_) - careful not to conflict with subscript
        .replace(/(?<!\w)\*(.*?)\*(?!\w)|(?<!\w)_(.*?)_(?!\w)/g, '<em>$1$2</em>')
        // Strikethrough (~~text~~)
        .replace(/~~(.*?)~~/g, '<del>$1</del>')
        // Inline code (`code`)
        .replace(/`([^`]+)`/g, '<code class="bg-gray-700/50 text-cyan-300 text-xs rounded px-1.5 py-0.5 font-mono">$1</code>')
        // Superscript (text^{...} or text^...)
        .replace(/\^\{([^}]+)\}/g, '<sup>$1</sup>')
        .replace(/\^([\w\d\+\-]+)/g, '<sup>$1</sup>')
        // Subscript (text_{...} or text_...)
        .replace(/_\{([^}]+)\}/g, '<sub>$1</sub>')
        .replace(/_(\d+)/g, '<sub>$1</sub>')
        // Logarithm (log_b(x) or log_{10}(x))
        .replace(/log_\{([^}]+)\}\((.*?)\)/g, 'log<sub>$1</sub>($2)')
        .replace(/log_(\w+)\((.*?)\)/g, 'log<sub>$1</sub>($2)')
        // Unordered lists
        .replace(/^\s*[-*+] (.*$)/gim, '<li class="ml-4 list-disc">$1</li>')
        // Newlines to <br> - careful with other elements
        .replace(/\n/g, '<br />')
        // Clean up <br> inside list items that were just created
        .replace(/<li(.*?)><br \/>/g, '<li$1>')
        // Wrap list items in <ul>
        .replace(/(<li>.*?<\/li>)/gs, '<ul>$1</ul>')
        // Remove duplicate <ul> tags
        .replace(/<\/ul>\s*<ul>/g, '');

    // Restore code blocks
    codeBlocks.forEach((block, index) => {
        const placeholder = `__CODEBLOCK_${index}__`;
        // Handle cases where the placeholder might be wrapped in paragraph tags or have <br>s
        html = html.replace(new RegExp(`<br />\\s*${placeholder}\\s*<br />`, 'g'), block);
        html = html.replace(placeholder, block);
    });

    return html;
}
