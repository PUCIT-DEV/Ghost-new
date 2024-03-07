import React from 'react';
import {Button, confirmIfDirty, useGlobalDirtyState} from '@tryghost/admin-x-design-system';

const ExitSettingsButton: React.FC = () => {
    const {isDirty} = useGlobalDirtyState();

    const navigateAway = () => {
        window.location.hash = '/dashboard';
    };

    return (
        <Button data-testid="exit-settings" id="done-button" label='&larr; Done' link={true} onClick={() => confirmIfDirty(isDirty, navigateAway)} />
    );
};

export default ExitSettingsButton;
