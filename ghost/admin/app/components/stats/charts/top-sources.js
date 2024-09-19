'use client';

import AllStatsModal from '../../modal-stats-all';
import Component from '@glimmer/component';
import React from 'react';
import moment from 'moment-timezone';
import {BarList, useQuery} from '@tinybirdco/charts';
import {CAMPAIGN_OPTIONS} from 'ghost-admin/utils/stats';
import {action} from '@ember/object';
import {barListColor} from '../../../utils/stats';
import {formatNumber} from '../../../helpers/format-number';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class TopSources extends Component {
    @inject config;
    @service modals;
    @service router;

    @tracked campaignOption = CAMPAIGN_OPTIONS[0];
    @tracked campaignOptions = CAMPAIGN_OPTIONS;

    @action
    onCampaignOptionChange(selected) {
        this.campaignOption = selected;
    }

    @action
    openSeeAll() {
        this.modals.open(AllStatsModal, {
            type: 'top-sources',
            chartRange: this.args.chartRange,
            audience: this.args.audience
        });
    }

    @action
    navigateToFilter(source) {
        this.updateQueryParams({source});
    }

    @action
    updateQueryParams(params) {
        const currentRoute = this.router.currentRoute;
        const newQueryParams = {...currentRoute.queryParams, ...params};

        this.router.replaceWith(currentRoute.name, {queryParams: newQueryParams});
    }

    ReactComponent = (props) => {
        let {chartRange, audience, device, browser} = props;

        const endDate = moment().endOf('day');
        const startDate = moment().subtract(chartRange - 1, 'days').startOf('day');

        const params = {
            site_uuid: this.config.stats.id,
            date_from: startDate.format('YYYY-MM-DD'),
            date_to: endDate.format('YYYY-MM-DD'),
            member_status: audience.length === 0 ? null : audience.join(','),
            device,
            browser,
            limit: 7
        };

        const {data, meta, error, loading} = useQuery({
            endpoint: `${this.config.stats.endpoint}/v0/pipes/top_sources.json`,
            token: this.config.stats.token,
            params
        });

        return (
            <BarList
                data={data}
                meta={meta}
                error={error}
                loading={loading}
                index="referrer"
                indexConfig={{
                    label: <span className="gh-stats-detail-header">Source</span>,
                    renderBarContent: ({label}) => (
                        <span className="gh-stats-detail-label">
                            <a
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    this.navigateToFilter(label || 'direct');
                                }}
                                className="gh-stats-domain"
                            >
                                <img src={`https://www.google.com/s2/favicons?domain=${label || 'direct'}&sz=32`} className="gh-stats-favicon" />
                                {label || 'Direct'}
                            </a>
                        </span>
                    )
                }}
                categories={['hits']}
                categoryConfig={{
                    hits: {
                        label: <span className="gh-stats-detail-header">Visits</span>,
                        renderValue: ({value}) => <span className="gh-stats-detail-value">{formatNumber(value)}</span>
                    }
                }}
                colorPalette={[barListColor]}
            />
        );
    };
}
