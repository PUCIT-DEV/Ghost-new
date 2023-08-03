import React, {useState} from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import StripeButton from '../../../admin-x-ds/settings/StripeButton';
import TabView from '../../../admin-x-ds/global/TabView';
import TiersList from './tiers/TiersList';
import useRouting from '../../../hooks/useRouting';
import {Tier} from '../../../types/api';
import {checkStripeEnabled, getActiveTiers, getArchivedTiers} from '../../../utils/helpers';
import {useBrowseTiers} from '../../../utils/api/tiers';
import {useGlobalData} from '../../providers/GlobalDataProvider';

const Tiers: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const [selectedTab, setSelectedTab] = useState('active-tiers');
    const {settings, config} = useGlobalData();
    const {data: {tiers} = {}} = useBrowseTiers();
    const activeTiers = getActiveTiers(tiers || []);
    const archivedTiers = getArchivedTiers(tiers || []);
    const {updateRoute} = useRouting();

    const openConnectModal = () => {
        updateRoute('stripe-connect');
    };

    const sortTiers = (t: Tier[]) => {
        t.sort((a, b) => {
            if ((a.monthly_price as number) < (b.monthly_price as number)) {
                return -1;
            } else {
                return 1;
            }
        });
        return t;
    };

    const tabs = [
        {
            id: 'active-tiers',
            title: 'Active',
            contents: (<TiersList tab='active-tiers' tiers={sortTiers(activeTiers)} />)
        },
        {
            id: 'archived-tiers',
            title: 'Archived',
            contents: (<TiersList tab='archive-tiers' tiers={sortTiers(archivedTiers)} />)
        }
    ];

    let content;
    if (checkStripeEnabled(settings, config)) {
        content = <TabView selectedTab={selectedTab} tabs={tabs} onTabChange={setSelectedTab} />;
    } else {
        content = <TiersList tab='free-tier' tiers={activeTiers.filter(tier => tier.type === 'free')} />;
    }

    return (
        <SettingGroup
            customButtons={checkStripeEnabled(settings, config) ?
                <button className='group flex items-center gap-2 rounded border border-grey-300 px-3 py-1.5 text-sm font-semibold text-grey-900 transition-all hover:border-grey-500' type='button' onClick={openConnectModal}>
                    <span className="inline-flex h-2 w-2 rounded-full bg-green transition-all group-hover:bg-[#625BF6]"></span>
                    Stripe connected
                </button>
                :
                <StripeButton onClick={openConnectModal}/>}
            description='Set prices and paid member sign up settings'
            keywords={keywords}
            navid='tiers'
            testId='tiers'
            title='Tiers'
        >
            {content}
        </SettingGroup>
    );
};

export default Tiers;
