'use client';

import AllStatsModal from '../../modal-stats-all';
import Component from '@glimmer/component';
import React from 'react';
import moment from 'moment-timezone';
import {BarList, useQuery} from '@tinybirdco/charts';
import {CONTENT_OPTIONS} from 'ghost-admin/utils/stats';
import {action} from '@ember/object';
import {barListColor} from '../../../utils/stats';
import {formatNumber} from '../../../helpers/format-number';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class TopPages extends Component {
    @inject config;

    @tracked contentOption = CONTENT_OPTIONS[0];
    @tracked contentOptions = CONTENT_OPTIONS;

    @service modals;

    @action
    openSeeAll(chartRange, audience) {
        this.modals.open(AllStatsModal, {
            type: 'top-pages',
            chartRange,
            audience
        });
    }

    @action
    onContentOptionChange(selected) {
        this.contentOption = selected;
    }

    ReactComponent = (props) => {
        let {chartRange, audience, device, browser, location, referrer, pathname} = props;

        const endDate = moment().endOf('day');
        const startDate = moment().subtract(chartRange - 1, 'days').startOf('day');

        /**
         * @typedef {Object} Params
         * @property {string} cid
         * @property {string} [date_from]
         * @property {string} [date_to]
         * @property {string} [member_status]
         * @property {number} [limit]
         * @property {number} [skip]
         */
        const params = {
            site_uuid: this.config.stats.id,
            date_from: startDate.format('YYYY-MM-DD'),
            date_to: endDate.format('YYYY-MM-DD'),
            member_status: audience.length === 0 ? null : audience.join(','),
            device,
            browser,
            location,
            referrer,
            pathname,
            limit: 7
        };

        const {data, meta, error, loading} = useQuery({
            endpoint: `${this.config.stats.endpoint}/v0/pipes/top_pages.json`,
            token: this.config.stats.token,
            params
        });

        return (
            <BarList
                data={data}
                meta={meta}
                error={error}
                loading={loading}
                index="pathname"
                indexConfig={{
                    label: <span className="gh-stats-detail-header">Post or page</span>,
                    renderBarContent: ({label}) => (
                        <span className="gh-stats-detail-label">{label}</span>
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
