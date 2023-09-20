import Button from '../../../admin-x-ds/global/Button';
import React from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import useRouting from '../../../hooks/useRouting';
import {withErrorBoundary} from '../../../admin-x-ds/global/ErrorBoundary';

const Navigation: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {updateRoute} = useRouting();
    const openPreviewModal = () => {
        updateRoute('navigation/edit');
    };

    return (
        <SettingGroup
            customButtons={<Button color='green' label='Customize' link linkWithPadding onClick={openPreviewModal}/>}
            description="Set up primary and secondary menus"
            keywords={keywords}
            navid='navigation'
            testId='navigation'
            title="Navigation"
        />
    );
};

export default withErrorBoundary(Navigation, 'Navigation');
