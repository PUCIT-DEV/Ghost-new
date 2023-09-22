import NoValueLabel from '../../../../admin-x-ds/global/NoValueLabel';
import React, {useMemo} from 'react';
import RecommendationIcon from './RecommendationIcon';
import Table from '../../../../admin-x-ds/global/Table';
import TableCell from '../../../../admin-x-ds/global/TableCell';
import TableRow from '../../../../admin-x-ds/global/TableRow';
import {Mention} from '../../../../api/mentions';
import {PaginationData} from '../../../../hooks/usePagination';
import {ReferrerHistoryItem} from '../../../../api/referrers';

interface IncomingRecommendationListProps {
    mentions: Mention[],
    stats: ReferrerHistoryItem[],
    pagination: PaginationData,
    isLoading: boolean
}

const IncomingRecommendationItem: React.FC<{mention: Mention, stats: ReferrerHistoryItem[]}> = ({mention, stats}) => {
    const cleanedSource = mention.source.replace('/.well-known/recommendations.json', '');

    const {signups, paidConversions, hasPaidColumn} = useMemo(() => {
        // Note: this should match the `getDomainFromUrl` method from OutboundLinkTagger
        let cleanedDomain = cleanedSource;
        try {
            cleanedDomain = new URL(cleanedSource).hostname.replace(/^www\./, '');
        } catch (_) {
            // Ignore invalid urls
        }

        return stats.reduce((acc, stat) => {
            acc.hasPaidColumn = acc.hasPaidColumn || stat.paid_conversions > 0;
            if (stat.source === cleanedDomain) {
                acc.signups += stat.signups;
                acc.paidConversions += stat.paid_conversions;
                return acc;
            }
            return acc;
        }, {
            signups: 0,
            paidConversions: 0,
            hasPaidColumn: false
        });
    }, [stats, cleanedSource]);

    const showDetails = () => {
        // Open url
        window.open(cleanedSource, '_blank');
    };

    const freeMembersLabel = (signups - paidConversions) === 1 ? 'free member' : 'free members';
    const paidConversionsLabel = (paidConversions === 1) ? 'paid member' : 'paid members';

    return (
        <TableRow hideActions>
            <TableCell onClick={showDetails}>
                <div className='group flex items-center gap-3 hover:cursor-pointer'>
                    <div className={`flex grow flex-col`}>
                        <div className="mb-0.5 flex items-center gap-3">
                            <RecommendationIcon favicon={mention.source_favicon} featured_image={mention.source_featured_image} title={mention.source_title || mention.source_site_title || cleanedSource} />
                            <span className='line-clamp-1'>{mention.source_title || mention.source_site_title || cleanedSource}</span>
                        </div>
                    </div>
                </div>
            </TableCell>
            <TableCell className='hidden align-middle md:!visible md:!table-cell' onClick={showDetails}>
                {(signups - paidConversions) === 0 ? <span className="text-grey-500">-</span> : (<div className='-mt-px flex grow items-end gap-1'><span>{signups - paidConversions}</span><span className='-mb-px whitespace-nowrap text-sm lowercase text-grey-700'>{freeMembersLabel}</span></div>)}
            </TableCell>
            {hasPaidColumn &&
                <TableCell className='hidden align-middle md:!visible md:!table-cell' onClick={showDetails}>
                    {paidConversions === 0 && <span className="text-grey-500">-</span>}
                    {paidConversions > 0 && (<div className='-mt-px flex grow items-end gap-1'><span>{paidConversions}</span><span className='whitespace-nowrap text-xs text-grey-700'>{paidConversionsLabel}</span></div>)}
                </TableCell>
            }
        </TableRow>
    );
};

const IncomingRecommendationList: React.FC<IncomingRecommendationListProps> = ({mentions, stats, pagination, isLoading}) => {
    if (isLoading || mentions.length) {
        return <Table isLoading={isLoading} pagination={pagination}>
            {mentions.map(mention => <IncomingRecommendationItem key={mention.id} mention={mention} stats={stats} />)}
        </Table>;
    } else {
        return <NoValueLabel>
            <span className='max-w-[40ch] text-center'>No one’s recommended you yet. Once they do, you’ll find them here along with how many memberships each has driven.</span>
        </NoValueLabel>;
    }
};

export default IncomingRecommendationList;
