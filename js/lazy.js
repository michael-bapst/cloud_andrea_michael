function initLazyLoad(container, items) {
    const batchSize = 30;
    let start = 0;

    function loadNext() {
        const slice = items.slice(start, start + batchSize);
        slice.forEach(item => {
            const wrapper = document.createElement('div');
            wrapper.appendChild(createFileCard(item));
            container.appendChild(wrapper);
        });
        start += batchSize;

        if (start < items.length) {
            const sentinel = document.createElement('div');
            sentinel.className = 'lazy-sentinel';
            observer.observe(sentinel);
            container.appendChild(sentinel);
        }
    }

    const observer = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
            observer.disconnect();
            container.querySelector('.lazy-sentinel')?.remove();
            loadNext();
        }
    });

    loadNext();
}
