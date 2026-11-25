// Walk open shadow roots because standard page text omits the public comment feed.
function readRows() {
    const feed = document.querySelector('bili-comments');
    if (!feed?.shadowRoot) return [];
    const rows = [];
    function visit(root, thread) {
        for (const node of root.querySelectorAll('*')) {
            let currentThread = thread;
            if (node.matches('bili-comment-thread-renderer')) {
                currentThread = 'thread-' + (rows.length + 1);
            }
            if (node.matches('bili-comment-reply-renderer, bili-comment-renderer')) {
                const comment = node.shadowRoot;
                const rendered = comment?.querySelector('bili-rich-text')?.shadowRoot?.querySelector('p');
                if (rendered) {
                    const copy = rendered.cloneNode(true);
                    for (const image of copy.querySelectorAll('img')) {
                        image.replaceWith(image.getAttribute('alt') || '');
                    }
                    for (const br of copy.querySelectorAll('br')) br.replaceWith('\n');
                    const actions = comment.querySelector('bili-comment-action-buttons-renderer')?.shadowRoot;
                    const annotated = Array.from(rendered.querySelectorAll('a[href]')).find(
                        a => new URL(a.href).searchParams.has('from_comid')
                    );
                    rows.push({
                        order: rows.length + 1,
                        thread: currentThread,
                        level: node.matches('bili-comment-renderer') ? 'top' : 'reply',
                        date: actions?.querySelector('#pubdate')?.textContent.trim() || '',
                        text: copy.textContent || '',
                        source_id: annotated ? new URL(annotated.href).searchParams.get('from_comid') : ''
                    });
                }
            }
            if (node.shadowRoot) visit(node.shadowRoot, currentThread);
        }
    }
    visit(feed.shadowRoot, '');
    return rows;
}
