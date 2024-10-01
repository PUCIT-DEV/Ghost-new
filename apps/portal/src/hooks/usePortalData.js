import {useState, useEffect, useCallback} from 'react';
import {fetchData} from '../utils/data-fetchers';

export const usePortalData = (props) => {
    const [state, setState] = useState({
        site: null,
        member: null,
        page: 'loading',
        showPopup: false,
        action: 'init:running',
        initStatus: 'running',
        lastPage: null,
        customSiteUrl: props.customSiteUrl
    });

    const updateState = useCallback((newState) => {
        setState(prevState => {
            const updatedState = {...prevState, ...newState};
            console.log('Updating state in usePortalData:', updatedState);
            return updatedState;
        });
    }, []);

    useEffect(() => {
        const initSetup = async () => {
            try {
                console.log(`initializing...`);
                console.log(`fetching data...`);
                const data = await fetchData(props);
                console.log(`data fetched, setting state`, data);
                updateState({
                    ...data,
                    action: 'init:success',
                    initStatus: 'success'
                });
            } catch (e) {
                console.error(`[Portal] Failed to initialize:`, e);
                updateState({
                    action: 'init:failed',
                    initStatus: 'failed'
                });
            }
        };

        initSetup();
    }, [props, updateState]);

    console.log('Current state in usePortalData:', state);
    return state;
};