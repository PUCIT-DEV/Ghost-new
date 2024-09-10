import APAvatar from '../global/APAvatar';
import React, {useState} from 'react';
import getRelativeTimestamp from '../../utils/get-relative-timestamp';
import getUsername from '../../utils/get-username';
import {ActorProperties, ObjectProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Button, Heading, Icon} from '@tryghost/admin-x-design-system';
import {useLikeMutationForUser, useUnlikeMutationForUser} from '../../hooks/useActivityPubQueries';

export function renderFeedAttachment(object: ObjectProperties, layout: string) {
    let attachment;
    if (object.image) {
        attachment = object.image;
    }

    if (object.type === 'Note' && !attachment) {
        attachment = object.attachment;
    }

    if (!attachment) {
        return null;
    }

    if (Array.isArray(attachment)) {
        const attachmentCount = attachment.length;

        let gridClass = '';
        if (layout === 'modal') {
            gridClass = 'grid-cols-1'; // Single image, full width
        } else if (attachmentCount === 2) {
            gridClass = 'grid-cols-2 auto-rows-[150px]'; // Two images, side by side
        } else if (attachmentCount === 3 || attachmentCount === 4) {
            gridClass = 'grid-cols-2 auto-rows-[150px]'; // Three or four images, two per row
        }

        return (
            <div className={`attachment-gallery mt-2 grid ${gridClass} gap-2`}>
                {attachment.map((item, index) => (
                    <img key={item.url} alt={`attachment-${index}`} className={`h-full w-full rounded-md object-cover ${attachmentCount === 3 && index === 0 ? 'row-span-2' : ''}`} src={item.url} />
                ))}
            </div>
        );
    }

    switch (attachment.mediaType) {
    case 'image/jpeg':
    case 'image/png':
    case 'image/gif':
        return <img alt='attachment' className='mt-2 rounded-md outline outline-1 -outline-offset-1 outline-black/10' src={attachment.url} />;
    case 'video/mp4':
    case 'video/webm':
        return <div className='relative mb-4 mt-2'>
            <video className='h-[300px] w-full rounded object-cover' src={attachment.url} controls/>
        </div>;

    case 'audio/mpeg':
    case 'audio/ogg':
        return <div className='relative mb-4 mt-2 w-full'>
            <audio className='w-full' src={attachment.url} controls/>
        </div>;
    default:
        return null;
    }
}

function renderInboxAttachment(object: ObjectProperties) {
    let attachment;
    if (object.image) {
        attachment = object.image;
    }

    if (object.type === 'Note' && !attachment) {
        attachment = object.attachment;
    }

    if (!attachment) {
        return null;
    }

    if (Array.isArray(attachment)) {
        const attachmentCount = attachment.length;
        // let gridClass = '';
        // if (attachmentCount === 2) {
        //     gridClass = 'grid-cols-2 auto-rows-[150px]'; // Two images, side by side
        // } else if (attachmentCount === 3 || attachmentCount === 4) {
        //     gridClass = 'grid-cols-2 auto-rows-[150px]'; // Three or four images, two per row
        // }
        return (
            <div className='min-w-[160px]'>
                <div className='relative'>
                    <img className={`h-[100px] w-[160px] rounded-md object-cover`} src={attachment[0].url} />
                    <div className='absolute bottom-1 right-1 z-10 rounded-full border border-[rgba(255,255,255,0.25)] bg-black px-2 py-0.5 font-semibold text-white'>+ {attachmentCount - 1}</div>
                </div>
            </div>
        );
    }

    switch (attachment.mediaType) {
    case 'image/jpeg':
    case 'image/png':
    case 'image/gif':
        return (
            <div className='min-w-[160px]'>
                <img className={`h-[100px] w-[160px] rounded-md object-cover`} src={attachment.url} />
            </div>
        );
    case 'video/mp4':
    case 'video/webm':
        return (
            <div className='min-w-[160px]'>
                <div className='relative mb-4 mt-2'>
                    <video className='h-[300px] w-full rounded object-cover' src={attachment.url} controls/>
                </div>
            </div>
        );

    case 'audio/mpeg':
    case 'audio/ogg':
        return (
            <div className='min-w-[160px]'>
                <div className='relative mb-4 mt-2 w-full'>
                    <audio className='w-full' src={attachment.url} controls/>
                </div>
            </div>
        );
    default:
        return null;
    }
}

const FeedItemStats: React.FC<{
    object: ObjectProperties;
    likeCount: number;
    commentCount: number;
    onLikeClick: () => void;
    onCommentClick: () => void;
}> = ({object, likeCount, commentCount, onLikeClick, onCommentClick}) => {
    const [isClicked, setIsClicked] = useState(false);
    const [isLiked, setIsLiked] = useState(object.liked);
    const likeMutation = useLikeMutationForUser('index');
    const unlikeMutation = useUnlikeMutationForUser('index');

    const handleLikeClick = async () => {
        setIsClicked(true);
        if (!isLiked) {
            likeMutation.mutate(object.id);
        } else {
            unlikeMutation.mutate(object.id);
        }

        setIsLiked(!isLiked);

        onLikeClick();
        setTimeout(() => setIsClicked(false), 300);
    };

    return (<div className='flex gap-5'>
        <div className='mt-3 flex gap-1'>
            <Button
                className={`self-start text-grey-900 transition-all hover:opacity-70 ${isClicked ? 'bump' : ''} ${isLiked ? 'ap-red-heart text-red *:!fill-red hover:text-red' : ''}`}
                hideLabel={true}
                icon='heart'
                id='like'
                size='md'
                unstyled={true}
                onClick={(e?: React.MouseEvent<HTMLElement>) => {
                    e?.stopPropagation();
                    handleLikeClick();
                }}
            />
            {isLiked && <span className={`text-grey-900`}>{likeCount}</span>}
        </div>
        <div className='mt-3 flex gap-1'>
            <Button
                className={`self-start text-grey-900`}
                hideLabel={true}
                icon='comment'
                id='comment'
                size='md'
                unstyled={true}
                onClick={(e?: React.MouseEvent<HTMLElement>) => {
                    e?.stopPropagation();
                    onCommentClick();
                }}
            />
            <span className={`text-grey-900`}>{commentCount}</span>
        </div>
    </div>);
};

interface FeedItemProps {
    actor: ActorProperties;
    object: ObjectProperties;
    layout: string;
    type: string;
    comments?: object[];
    last?: boolean;
}

const FeedItem: React.FC<FeedItemProps> = ({actor, object, layout, type, comments = [], last}) => {
    const timestamp =
        new Date(object?.published ?? new Date()).toLocaleDateString('default', {year: 'numeric', month: 'short', day: '2-digit'}) + ', ' + new Date(object?.published ?? new Date()).toLocaleTimeString('default', {hour: '2-digit', minute: '2-digit'});

    const date = new Date(object?.published ?? new Date());

    const onLikeClick = () => {
        // Do API req or smth
        // Don't need to know about setting timeouts or anything like that
    };

    let author = actor;
    if (type === 'Announce' && object.type === 'Note') {
        author = typeof object.attributedTo === 'object' ? object.attributedTo as ActorProperties : actor;
    }

    if (layout === 'feed') {
        return (
            <>
                {object && (
                    <div className={`group/article relative cursor-pointer pt-6`}>
                        {(type === 'Announce' && object.type === 'Note') && <div className='z-10 mb-2 flex items-center gap-3 text-grey-700'>
                            <div className='z-10 flex w-10 justify-end'><Icon colorClass='text-grey-700' name='reload' size={'sm'}></Icon></div>
                            <span className='z-10'>{actor.name} reposted</span>
                        </div>}
                        <div className={`border-1 z-10 -my-1 grid grid-cols-[auto_1fr] grid-rows-[auto_1fr] gap-x-3 gap-y-2 border-b-grey-200 pb-6`} data-test-activity>
                            <APAvatar author={author}/>
                            {/* <div className='border-1 z-10 -mt-1 flex w-full flex-col items-start justify-between border-b border-b-grey-200 pb-4' data-test-activity> */}
                            <div className='relative z-10 flex w-full flex-col overflow-visible text-[1.5rem]'>
                                <div className='flex'>
                                    <span className='truncate whitespace-nowrap font-bold' data-test-activity-heading>{author.name}</span>
                                    <span className='whitespace-nowrap text-grey-700 before:mx-1 before:content-["·"]' title={`${timestamp}`}>{getRelativeTimestamp(date)}</span>
                                </div>
                                <div className='flex'>
                                    <span className='truncate text-grey-700'>{getUsername(author)}</span>
                                </div>
                            </div>
                            <div className={`relative z-10 col-start-2 col-end-3 w-full gap-4`}>
                                <div className='flex flex-col'>
                                    {object.name && <Heading className='mb-1 leading-tight' level={4} data-test-activity-heading>{object.name}</Heading>}
                                    <div dangerouslySetInnerHTML={({__html: object.content})} className='ap-note-content text-pretty text-[1.5rem] text-grey-900'></div>
                                    {renderFeedAttachment(object, layout)}
                                    <FeedItemStats
                                        commentCount={comments.length}
                                        likeCount={1}
                                        object={object}
                                        onCommentClick={onLikeClick}
                                        onLikeClick={onLikeClick}
                                    />
                                </div>
                            </div>
                            {/* </div> */}
                        </div>
                        <div className={`absolute -inset-x-3 -inset-y-0 z-0 rounded transition-colors ${(layout === 'feed') ? 'group-hover/article:bg-grey-75' : ''} `}></div>
                    </div>
                )}
            </>
        );
    } else if (layout === 'modal') {
        return (
            <>
                {object && (
                    <div>
                        <div className={`group/article relative cursor-pointer`}>
                            {(type === 'Announce' && object.type === 'Note') && <div className='z-10 mb-2 flex items-center gap-3 text-grey-700'>
                                <div className='z-10 flex w-10 justify-end'><Icon colorClass='text-grey-700' name='reload' size={'sm'}></Icon></div>
                                <span className='z-10'>{actor.name} reposted</span>
                            </div>}
                            <div className={`z-10 -my-1 grid grid-cols-[auto_1fr] grid-rows-[auto_1fr] gap-3 pb-4`} data-test-activity>
                                <div className='relative z-10 pt-[3px]'>
                                    <APAvatar author={author}/>
                                </div>
                                {/* <div className='border-1 z-10 -mt-1 flex w-full flex-col items-start justify-between border-b border-b-grey-200 pb-4' data-test-activity> */}
                                <div className='relative z-10 flex w-full flex-col overflow-visible text-[1.5rem]'>
                                    <div className='flex'>
                                        <span className='truncate whitespace-nowrap font-bold' data-test-activity-heading>{author.name}</span>
                                        <span className='whitespace-nowrap text-grey-700 before:mx-1 before:content-["·"]' title={`${timestamp}`}>{getRelativeTimestamp(date)}</span>
                                    </div>
                                    <div className='flex'>
                                        <span className='truncate text-grey-700'>{getUsername(author)}</span>
                                    </div>
                                </div>
                                <div className={`relative z-10 col-start-1 col-end-3 w-full gap-4`}>
                                    <div className='flex flex-col'>
                                        {object.name && <Heading className='mb-1 leading-tight' level={4} data-test-activity-heading>{object.name}</Heading>}
                                        <div dangerouslySetInnerHTML={({__html: object.content})} className='ap-note-content text-pretty text-[1.6rem] text-grey-900'></div>
                                        {renderFeedAttachment(object, layout)}
                                        <FeedItemStats
                                            commentCount={comments.length}
                                            likeCount={1}
                                            object={object}
                                            onCommentClick={onLikeClick}
                                            onLikeClick={onLikeClick}
                                        />
                                    </div>
                                </div>
                                {/* </div> */}
                            </div>
                            <div className={`absolute -inset-x-3 -inset-y-0 z-0 rounded transition-colors`}></div>
                        </div>
                        <div className="mx-[-32px] my-4 h-px w-[120%] bg-grey-200"></div>
                    </div>

                )}
            </>
        );
    } else if (layout === 'reply') {
        return (
            <>
                {object && (
                    <div className={`group/article relative cursor-pointer pt-5`}>
                        {(type === 'Announce' && object.type === 'Note') && <div className='z-10 mb-2 flex items-center gap-3 text-grey-700'>
                            <div className='z-10 flex w-10 justify-end'><Icon colorClass='text-grey-700' name='reload' size={'sm'}></Icon></div>
                            <span className='z-10'>{actor.name} reposted</span>
                        </div>}
                        <div className={`border-1 z-10 -my-1 grid grid-cols-[auto_1fr] grid-rows-[auto_1fr] gap-x-3 gap-y-2 border-b-grey-200 pb-4`} data-test-activity>
                            <div className='relative z-10 pt-[3px]'>
                                <APAvatar author={author}/>
                            </div>
                            {/* <div className='border-1 z-10 -mt-1 flex w-full flex-col items-start justify-between border-b border-b-grey-200 pb-4' data-test-activity> */}
                            <div className='relative z-10 flex w-full flex-col overflow-visible text-[1.5rem]'>
                                <div className='flex'>
                                    <span className='truncate whitespace-nowrap font-bold' data-test-activity-heading>{author.name}</span>
                                    <span className='whitespace-nowrap text-grey-700 before:mx-1 before:content-["·"]' title={`${timestamp}`}>{getRelativeTimestamp(date)}</span>
                                </div>
                                <div className='flex'>
                                    <span className='truncate text-grey-700'>{getUsername(author)}</span>
                                </div>
                            </div>
                            <div className={`relative z-10 col-start-2 col-end-3 w-full gap-4`}>
                                <div className='flex flex-col'>
                                    {object.name && <Heading className='mb-1 leading-tight' level={4} data-test-activity-heading>{object.name}</Heading>}
                                    <div dangerouslySetInnerHTML={({__html: object.content})} className='ap-note-content text-pretty text-[1.5rem] text-grey-900'></div>
                                    {renderFeedAttachment(object, layout)}
                                    <FeedItemStats
                                        commentCount={comments.length}
                                        likeCount={1}
                                        object={object}
                                        onCommentClick={onLikeClick}
                                        onLikeClick={onLikeClick}
                                    />
                                </div>
                            </div>
                            {/* </div> */}
                        </div>
                        <div className={`absolute -inset-x-3 -inset-y-0 z-0 rounded transition-colors`}></div>
                        {!last && <div className="absolute bottom-0 left-[18px] top-[6.5rem] z-0 mb-[-9px] w-[2px] rounded-sm bg-grey-200"></div>}
                    </div>
                )}
            </>
        );
    } else if (layout === 'inbox') {
        return (
            <>
                {object && (
                    <div className='group/article relative -mx-4 -mt-px cursor-pointer rounded-md px-4 hover:bg-grey-75'>
                        <div className='z-10 flex items-start gap-3 py-4 group-hover/article:border-transparent'>
                            <APAvatar author={author} size='xs'/>
                            <div className='z-10 w-full'>
                                <div className='mb-1'>
                                    <span className='truncate whitespace-nowrap font-semibold' data-test-activity-heading>{author.name}</span>
                                    <span className='truncate text-grey-700'>&nbsp;{getUsername(author)}</span>
                                    <span className='whitespace-nowrap text-grey-700 before:mx-1 before:content-["·"]' title={`${timestamp}`}>{getRelativeTimestamp(date)}</span>
                                </div>
                                <div className='flex w-full items-start justify-between gap-5'>
                                    <div className='grow'>
                                        {object.name && <Heading className='leading-tight' level={5} data-test-activity-heading>{object.name}</Heading>}
                                        <div dangerouslySetInnerHTML={({__html: object.content})} className='ap-note-content mt-1 line-clamp-3 text-pretty text-[1.5rem] text-grey-900'></div>
                                    </div>
                                    {renderInboxAttachment(object)}
                                </div>
                                <FeedItemStats
                                    commentCount={comments.length}
                                    likeCount={1}
                                    object={object}
                                    onCommentClick={onLikeClick}
                                    onLikeClick={onLikeClick}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    return (<></>);
};

export default FeedItem;
