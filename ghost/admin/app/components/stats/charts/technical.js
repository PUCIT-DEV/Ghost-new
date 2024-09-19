'use client';

import Component from '@glimmer/component';
import React from 'react';
import moment from 'moment-timezone';
import {DonutChart, useQuery} from '@tinybirdco/charts';
import {action} from '@ember/object';
import {formatNumber} from '../../../helpers/format-number';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';
import {statsStaticColors} from 'ghost-admin/utils/stats';

export default class TechnicalComponent extends Component {
    @inject config;
    @service router;

    @action
    navigateToFilter(type, value) {
        this.updateQueryParams({[type]: value});
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

        const colorPalette = statsStaticColors.slice(1, 5);

        const params = {
            site_uuid: this.config.stats.id,
            date_from: startDate.format('YYYY-MM-DD'),
            date_to: endDate.format('YYYY-MM-DD'),
            member_status: audience.length === 0 ? null : audience.join(','),
            device,
            browser,
            limit: 5
        };

        let endpoint;

        switch (props.selected) {
        case 'browsers':
            endpoint = `${this.config.stats.endpoint}/v0/pipes/top_browsers.json`;
            break;
        default:
            endpoint = `${this.config.stats.endpoint}/v0/pipes/top_devices.json`;
        }

        const {data, meta, error, loading} = useQuery({
            endpoint: endpoint,
            token: this.config.stats.token,
            params
        });

        let transformedData;
        let indexBy;
        let tableHead;

        switch (props.selected) {
        case 'browsers':
            transformedData = (data ?? []).map((item, index) => ({
                name: item.browser.charAt(0).toUpperCase() + item.browser.slice(1),
                value: item.hits,
                color: colorPalette[index]
            }));
            indexBy = 'browser';
            tableHead = 'Browser';
            break;
        default:
            transformedData = (data ?? []).map((item, index) => ({
                name: item.device.charAt(0).toUpperCase() + item.device.slice(1),
                value: item.hits,
                color: colorPalette[index]
            }));
            indexBy = 'device';
            tableHead = 'Device';
        }

        return (
            <div className="gh-stats-piechart-container">
                <table>
                    <thead>
                        <tr>
                            <th><span className="gh-stats-detail-header">{tableHead}</span></th>
                            <th><span className="gh-stats-detail-header">Visits</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        {transformedData.map((item, index) => (
                            <tr key={index}>
                                <td>
                                    <a
                                        href="#"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            this.navigateToFilter(indexBy, item.name.toLowerCase());
                                        }}
                                        className="gh-stats-domain"
                                    >
                                        <span style={{backgroundColor: item.color, display: 'inline-block', width: '10px', height: '10px', marginRight: '5px', borderRadius: '2px'}}></span>
                                        {item.name}
                                    </a>
                                </td>
                                <td>{formatNumber(item.value)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="gh-stats-piechart">
                    <DonutChart
                        data={data}
                        meta={meta}
                        loading={loading}
                        error={error}
                        index={indexBy}
                        categories={['hits']}
                        colorPalette={colorPalette}
                        backgroundColor="transparent"
                        fontSize="13px"
                        textColor="#AEB7C1"
                        showLegend={true}
                        params={params}
                        height="210px"
                        options={{
                            color: colorPalette,
                            tooltip: {
                                show: true,
                                trigger: 'item',
                                backgroundColor: '#fff',
                                textStyle: {
                                    color: '#15171A'
                                },
                                extraCssText: 'border: none !important; box-shadow: 0px 100px 80px 0px rgba(0, 0, 0, 0.07), 0px 41.778px 33.422px 0px rgba(0, 0, 0, 0.05), 0px 22.336px 17.869px 0px rgba(0, 0, 0, 0.04), 0px 12.522px 10.017px 0px rgba(0, 0, 0, 0.04), 0px 6.65px 5.32px 0px rgba(0, 0, 0, 0.03), 0px 2.767px 2.214px 0px rgba(0, 0, 0, 0.02);',
                                formatter: function (fparams) {
                                    return `<span style="background-color: ${fparams.color}; display: inline-block; width: 10px; height: 10px; margin-right: 5px; border-radius: 2px;"></span> ${fparams.name}: ${formatNumber(fparams.value)}`;
                                }
                            },
                            legend: {
                                show: false,
                                orient: 'vertical',
                                left: 'left',
                                textStyle: {
                                    color: '#AEB7C1'
                                }
                            },
                            series: [
                                {
                                    animation: true,
                                    name: tableHead,
                                    type: 'pie',
                                    radius: ['60%', '90%'],
                                    center: ['50%', '50%'], // Adjusted to align the chart to the top
                                    data: transformedData,
                                    label: {
                                        show: false,
                                        formatter: '{b}: {c}'
                                    },
                                    labelLine: {
                                        lineStyle: {
                                            color: '#DDE1E5'
                                        },
                                        smooth: 0.2,
                                        length: 10,
                                        length2: 20
                                    },
                                    padding: 0
                                }
                            ]
                        }}
                    />
                </div>
            </div>
        );
    };
}
