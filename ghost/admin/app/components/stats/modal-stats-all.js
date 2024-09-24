'use client';

import Component from '@glimmer/component';
import React from 'react';
import {BarList, useQuery} from '@tinybirdco/charts';
import {barListColor, getCountryFlag, getStatsParams} from 'ghost-admin/utils/stats';
import {formatNumber} from 'ghost-admin/helpers/format-number';
import {inject} from 'ghost-admin/decorators/inject';

export default class AllStatsModal extends Component {
    @inject config;

    get type() {
        return this.args.data.type;
    }

    get chartRange() {
        return this.args.data.chartRange;
    }

    get audience() {
        return this.args.data.audience;
    }

    get modalTitle() {
        switch (this.type) {
        case 'top-sources':
            return 'Sources';
        case 'top-locations':
            return 'Locations';
        default:
            return 'Content';
        }
    }

    ReactComponent = (props) => {
        const {chartRange, audience, type} = props;

        const params = getStatsParams(
            this.config,
            chartRange,
            audience
        );

        let endpoint;
        let labelText;
        let indexBy;
        let unknownOption = 'Unknown';
        switch (type) {
        case 'top-sources':
            endpoint = `${this.config.stats.endpoint}/v0/pipes/top_sources.json`;
            labelText = 'Source';
            indexBy = 'source';
            unknownOption = 'Direct';
            break;
        case 'top-locations':
            endpoint = `${this.config.stats.endpoint}/v0/pipes/top_locations.json`;
            labelText = 'Country';
            indexBy = 'location';
            unknownOption = 'Unknown';
            break;
        default:
            endpoint = `${this.config.stats.endpoint}/v0/pipes/top_pages.json`;
            labelText = 'Post or page';
            indexBy = 'pathname';
            break;
        }

        const {data, meta, error, loading} = useQuery({
            endpoint: endpoint,
            token: this.config.stats.token,
            params
        });

        return (
            <BarList
                data={data}
                meta={meta}
                error={error}
                loading={loading}
                index={indexBy}
                indexConfig={{
                    label: <span className="gh-stats-data-header">{labelText}</span>,
                    renderBarContent: ({label}) => (
                        <span className={`gh-stats-data-label ${type === 'top-sources' && 'gh-stats-domain'}`}>{(type === 'top-locations') && getCountryFlag(label)} {type === 'top-sources' && (<img src={`https://www.google.com/s2/favicons?domain=${label || 'direct'}&sz=32`} className="gh-stats-favicon" />)} {label || unknownOption}</span>
                    )
                }}
                categories={['hits']}
                categoryConfig={{
                    hits: {
                        label: <span className="gh-stats-data-header">Visits</span>,
                        renderValue: ({value}) => <span className="gh-stats-data-value">{formatNumber(value)}</span>
                    }
                }}
                colorPalette={[barListColor]}
            />
        );
    };
}
