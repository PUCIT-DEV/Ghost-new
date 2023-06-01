import React from 'react';
import {SignupFormOptions} from '../AppContext';

export function useOptions(scriptTag: HTMLElement) {
    const buildOptions = React.useCallback(() => {
        const labels = [];

        while (scriptTag.dataset[`label-${labels.length + 1}`]) {
            labels.push(scriptTag.dataset[`label-${labels.length + 1}`] as string);
        }

        return {
            title: scriptTag.dataset.title || undefined,
            description: scriptTag.dataset.description || undefined,
            logo: scriptTag.dataset.logo || undefined,
            backgroundColor: scriptTag.dataset.backgroundColor || undefined,
            buttonColor: scriptTag.dataset.buttonColor || undefined,
            site: scriptTag.dataset.site || window.location.origin,
            labels
        };
    }, [scriptTag]);

    const [options, setOptions] = React.useState<SignupFormOptions>(buildOptions());

    React.useEffect(() => {
        const observer = new MutationObserver((mutationList) => {
            if (mutationList.some(mutation => mutation.type === 'attributes')) {
                setOptions(buildOptions());
            }
        });

        observer.observe(scriptTag, {
            attributes: true
        });

        return () => {
            observer.disconnect();
        };
    }, [scriptTag, buildOptions]);

    return options;
}
