import React, {useEffect, useMemo} from 'react';
import AppContext from './AppContext';
import SentryErrorBoundary from './components/SentryErrorBoundary.js';
import PortalContent from './components/PortalContent.js';
import TriggerButton from './components/TriggerButton.js';  // Import TriggerButton
import {usePortalData} from './hooks/usePortalData';
import {usePortalActions} from './hooks/usePortalActions';
import {setupRecommendationButtons, transformPortalLinksToRelative} from './utils/portal-utils';
import {handleDataAttributes} from './data-attributes';

const App = (props) => {
    // console.log('App component rendering');
    const state = usePortalData(props);
    // console.log('State from usePortalData:', state);
    
    const [actionState, dispatchAction] = usePortalActions(state, state.api);
    // console.log('Action state:', actionState);

    useEffect(() => {
        // console.log(`App > useEffect > state.initStatus`, state.initStatus);
        if (state.initStatus === 'success') {
            // console.log(`initStatus: success, setting up components`);
            setupRecommendationButtons(dispatchAction);
            transformPortalLinksToRelative();
            handleDataAttributes({
                siteUrl: props.siteUrl,
                site: state.site,
                member: state.member
            });
        }
    }, [state.initStatus, state.site, state.member, props.siteUrl, dispatchAction]);

    const contextValue = useMemo(() => {
        // console.log('Updating contextValue', {state, actionState});
        const newContextValue = {
            ...state,
            ...actionState,
            dispatchAction
        };
        // console.log('New context value:', newContextValue);
        return newContextValue;
    }, [state, actionState, dispatchAction]);

    // console.log(`App render, initStatus:`, state.initStatus);
    // console.log(`state.site:`, state.site);
    // console.log(`contextValue:`, contextValue);

    if (state.initStatus === 'running') {
        // console.log(`Rendering loading state`);
        return <div>Loading...</div>;
    }

    if (state.initStatus === 'failed') {
        // console.log(`Rendering failed state`);
        return <div>Failed to load portal data. Please try again later.</div>;
    }

    // console.log(`Rendering success state`);

    return (
        <SentryErrorBoundary site={state.site}>
            <AppContext.Provider value={contextValue}>
                <PortalContent />
            </AppContext.Provider>
        </SentryErrorBoundary>
    );
};

export default App;