import Button from '../../../admin-x-ds/global/Button';
import DesignModal from './DesignModal';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';

const DesignSetting: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const openPreviewModal = () => {
        NiceModal.show(DesignModal);
    };

    return (
        <SettingGroup
            customButtons={<Button color='green' label='Customize' link onClick={openPreviewModal}/>}
            description="Customize the look and feel of your site"
            keywords={keywords}
            navid='branding-and-design'
            testId='design'
            title="Branding and design"
        />
    );
};

export default DesignSetting;
