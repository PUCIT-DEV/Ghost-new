import Button from '../../../admin-x-ds/global/Button';
import IncomingRecommendations from './recommendations/IncomingRecommendations';
import Link from '../../../admin-x-ds/global/Link';
import React, {useState} from 'react';
import RecommendationList from './recommendations/RecommendationList';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import TabView from '../../../admin-x-ds/global/TabView';
import useRouting from '../../../hooks/useRouting';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {useBrowseRecommendations} from '../../../api/recommendations';

const Recommendations: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {
        saveState,
        siteData,
        handleSave
    } = useSettingGroup();

    const {pagination, data: {recommendations} = {}, isLoading} = useBrowseRecommendations();
    const [selectedTab, setSelectedTab] = useState('your-recommendations');

    const {updateRoute} = useRouting();
    const openAddNewRecommendationModal = () => {
        updateRoute('recommendations/add');
    };

    const buttons = (
        <Button color='green' label='Add recommendation' link={true} onClick={() => {
            openAddNewRecommendationModal();
        }} />
    );

    const recommendationsURL = `${siteData?.url.replace(/\/$/, '')}/#/portal/recommendations`;

    const tabs = [
        {
            id: 'your-recommendations',
            title: 'Your recommendations',
            contents: (<RecommendationList isLoading={isLoading} pagination={pagination} recommendations={recommendations ?? []}/>)
        },
        {
            id: 'recommending-you',
            title: 'Recommending you',
            contents: (<IncomingRecommendations />)
        }
    ];

    const groupDescription = (
        <>Share favorite sites with your audience after they subscribe. {(pagination && pagination.total && pagination.total > 0) && <Link href={recommendationsURL} target='_blank'>Preview</Link>}</>
    );

    return (
        <SettingGroup
            customButtons={buttons}
            description={groupDescription}
            keywords={keywords}
            navid='recommendations'
            saveState={saveState}
            testId='recommendations'
            title="Recommendations"
            onSave={handleSave}
        >
            <TabView selectedTab={selectedTab} tabs={tabs} onTabChange={setSelectedTab} />
        </SettingGroup>
    );
};

export default Recommendations;
