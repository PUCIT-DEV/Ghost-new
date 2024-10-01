export const setupRecommendationButtons = (dispatchAction) => {
    const clickHandler = (event) => {
        const recommendationId = event.currentTarget.dataset.recommendation;
        if (recommendationId) {
            dispatchAction('trackRecommendationClicked', {recommendationId}).catch(console.error);
        } else {
            console.warn('[Portal] Invalid usage of data-recommendation attribute');
        }
    };

    const elements = document.querySelectorAll('[data-recommendation]');
    elements.forEach((element) => {
        element.addEventListener('click', clickHandler, {passive: true});
    });
};

export const transformPortalLinksToRelative = () => {
    document.querySelectorAll('a[href*="#/portal"]').forEach(transformPortalAnchorToRelative);
};

export const transformPortalAnchorToRelative = (anchor) => {
    const hrefParts = anchor.href.split('#/portal');
    if (hrefParts.length > 1) {
        anchor.href = '#/portal' + hrefParts[1];
    }
};