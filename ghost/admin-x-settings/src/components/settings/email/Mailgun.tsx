import Link from '../../../admin-x-ds/global/Link';
import React, {useState} from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import SettingGroupInputs from '../../../admin-x-ds/settings/SettingGroupInputs';
import SettingGroupValues from '../../../admin-x-ds/settings/SettingGroupValues';
import {TSettingGroupStates} from '../../../admin-x-ds/settings/SettingGroup';

const MailGun: React.FC = () => {
    const [currentState, setCurrentState] = useState<TSettingGroupStates>('view');

    const handleStateChange = (newState: TSettingGroupStates) => {
        setCurrentState(newState);
    };

    const values = (
        <SettingGroupValues
            columns={2}
            values={[
                {
                    heading: 'Status',
                    key: 'status',
                    value: 'Mailgun is not set up'
                }
            ]}
        />
    );

    const inputs = (
        <SettingGroupInputs>
            
        </SettingGroupInputs>
    );

    return (
        <SettingGroup 
            description={<>The Mailgun API is used for bulk email newsletter delivery. <Link href='https://ghost.org/docs/faq/mailgun-newsletters/' target='_blank'>Why is this required?</Link></>}
            state={currentState} 
            title='Mailgun' 
            onStateChange={handleStateChange}
        >
            {currentState === 'view' ? values : inputs}
        </SettingGroup>
    );
};

export default MailGun;