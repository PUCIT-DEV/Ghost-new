// import NiceModal from '@ebay/nice-modal-react';
import React, {useState} from 'react';
import articleBodyStyles from './articleBodyStyles';
import getUsername from '../utils/get-username';
import {ActorProperties, ObjectProperties, useBrowseFollowingForUser, useBrowseInboxForUser} from '@tryghost/admin-x-framework/api/activitypub';
import {Avatar, Button, Heading, List, ListItem, Page, SettingValue, ViewContainer, ViewTab} from '@tryghost/admin-x-design-system';
import {useBrowseSite} from '@tryghost/admin-x-framework/api/site';
import {useRouting} from '@tryghost/admin-x-framework/routing';

interface ViewArticleProps {
    object: ObjectProperties,
    onBackToList: () => void;
}

const ActivityPubComponent: React.FC = () => {
    const {updateRoute} = useRouting();

    // TODO: Replace with actual user ID
    const {data: {orderedItems: activities = []} = {}} = useBrowseInboxForUser('deadbeefdeadbeefdeadbeef');
    const {data: {totalItems: followingCount = 0} = {}} = useBrowseFollowingForUser('deadbeefdeadbeefdeadbeef');

    const [articleContent, setArticleContent] = useState<ObjectProperties | null>(null);
    const [, setArticleActor] = useState<ActorProperties | null>(null);

    const handleViewContent = (object: ObjectProperties, actor: ActorProperties) => {
        setArticleContent(object);
        setArticleActor(actor);
    };

    const handleBackToList = () => {
        setArticleContent(null);
    };

    const [selectedTab, setSelectedTab] = useState('inbox');

    const tabs: ViewTab[] = [
        {
            id: 'inbox',
            title: 'Inbox',
            contents: <div className='grid grid-cols-6 items-start gap-8'>
                <ul className='order-2 col-span-6 flex flex-col lg:order-1 lg:col-span-4'>
                    {activities && activities.slice().reverse().map(activity => (
                        activity.type === 'Create' && activity.object.type === 'Article' &&
                        <li key={activity.id} data-test-view-article onClick={() => handleViewContent(activity.object, activity.actor)}>
                            <ObjectContentDisplay actor={activity.actor} object={activity.object}/>
                        </li>
                    ))}
                </ul>
                <Sidebar followingCount={followingCount} updateRoute={updateRoute} />
            </div>
        },
        {
            id: 'activity',
            title: 'Activity',
            contents: <div className='grid grid-cols-6 items-start gap-8'><List className='col-span-4'>
                <ListItem avatar={<Avatar image='https://activitypub.ghost.is/favicon.ico' size='sm' />} id='list-item' title={<div><span className='font-medium'>@index@activitypub.ghost.is</span><span className='text-grey-800'> liked your post </span><span className='font-medium'>Why ActivityPug Will Never Beat ActivityPub</span></div>}></ListItem>
                <ListItem avatar={<Avatar image='https://activitypub.ghost.is/favicon.ico' size='sm' />} id='list-item' title={<div><span className='font-medium'>@index@activitypub.ghost.is</span><span className='text-grey-800'> liked your post </span><span className='font-medium'>Top 11 Reasons Why John Should Get a Pug</span></div>}></ListItem>
                <ListItem avatar={<Avatar image='https://activitypub.ghost.is/favicon.ico' size='sm' />} id='list-item' title={<div><span className='font-medium'>@index@activitypub.ghost.is</span><span className='text-grey-800'> followed you</span></div>}></ListItem>
            </List>
            <Sidebar followingCount={followingCount} updateRoute={updateRoute} />
            </div>
        },
        {
            id: 'likes',
            title: 'Likes',
            contents: <div className='grid grid-cols-6 items-start gap-8'>
                <ul className='order-2 col-span-6 flex flex-col lg:order-1 lg:col-span-4'>
                    {activities && activities.slice().reverse().map(activity => (
                        activity.type === 'Create' && activity.object.type === 'Article' &&
                    <li key={activity.id} data-test-view-article onClick={() => handleViewContent(activity.object, activity.actor)}>
                        <ObjectContentDisplay actor={activity.actor} object={activity.object}/>
                    </li>
                    ))}
                </ul>
                <Sidebar followingCount={followingCount} updateRoute={updateRoute} />
            </div>
        }
    ];

    return (
        <Page>
            {!articleContent ? (
                <ViewContainer
                    firstOnPage={true}
                    primaryAction={{
                        title: 'Follow',
                        onClick: () => {
                            updateRoute('follow-site');
                        },
                        icon: 'add'
                    }}
                    selectedTab={selectedTab}
                    stickyHeader={true}
                    tabs={tabs}
                    toolbarBorder={false}
                    type='page'
                    onTabChange={setSelectedTab} 
                >   
                </ViewContainer>

            ) : (
                <ViewArticle object={articleContent} onBackToList={handleBackToList} />
            )}

        </Page>
    );
};

const Sidebar: React.FC<{followingCount: number, updateRoute: (route: string) => void}> = ({followingCount, updateRoute}) => (
    <div className='order-1 col-span-6 rounded-xl bg-grey-50 p-6 lg:order-2 lg:col-span-2' id="ap-sidebar">
        <div className='mb-4 border-b border-b-grey-200 pb-4'><SettingValue key={'your-username'} heading={'Your username'} value={'@index@localplaceholder.com'}/></div>
        <div className='grid grid-cols-2 gap-4'>
            <div className='group/stat flex cursor-pointer flex-col gap-1' onClick={() => updateRoute('/view-following')}>
                <span className='text-3xl font-bold leading-none' data-test-following-count>{followingCount}</span>
                <span className='text-base leading-none text-grey-800 group-hover/stat:text-grey-900' data-test-following-modal>Following<span className='ml-1 opacity-0 transition-opacity group-hover/stat:opacity-100'>&rarr;</span></span>
            </div>
            <div className='group/stat flex cursor-pointer flex-col gap-1' onClick={() => updateRoute('/view-followers')}>
                <span className='text-3xl font-bold leading-none' data-test-following-count>0</span>
                <span className='text-base leading-none text-grey-800 group-hover/stat:text-grey-900' data-test-followers-modal>Followers<span className='ml-1 opacity-0 transition-opacity group-hover/stat:opacity-100'>&rarr;</span></span>
            </div>
        </div>
        {/* <ul data-test-following>
                        {following && following.slice().map(({username}) => <li key={username} className='mb-4'>
                            <span className='mb-2 text-md font-medium text-grey-800'>{username}</span>
                        </li>)}
                    </ul> */}
    </div>
);

const ArticleBody: React.FC<{heading: string, image: string|undefined, html: string}> = ({heading, image, html}) => {
    // const dangerouslySetInnerHTML = {__html: html};
    // const cssFile = '../index.css';
    const site = useBrowseSite();
    const siteData = site.data?.site;

    const cssContent = articleBodyStyles(siteData?.url.replace(/\/$/, ''));

    const htmlContent = `
  <html>
  <head>
      ${cssContent}
  </head>
  <body>
    <header class="gh-article-header gh-canvas">
        <h1 class="gh-article-title is-title" data-test-article-heading>${heading}</h1>
${image &&
        `<figure class="gh-article-image">
            <img src="${image}" alt="${heading}" />
        </figure>`
}
    </header>
    <div class="gh-content gh-canvas is-body">
      ${html}
    </div>
  </body>
  </html>
`;

    return (
        <iframe
            className='h-[calc(100vh_-_3vmin_-_4.8rem_-_2px)]'
            height="100%"
            id="gh-ap-article-iframe"
            srcDoc={htmlContent}
            title="Embedded Content"
            width="100%"
        >
        </iframe>
    );
};

const ObjectContentDisplay: React.FC<{actor: ActorProperties, object: ObjectProperties }> = ({actor, object}) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(object.content || '', 'text/html');

    const plainTextContent = doc.body.textContent;
    const timestamp =
        new Date(object?.published ?? new Date()).toLocaleDateString('default', {year: 'numeric', month: 'short', day: '2-digit'}) + ', ' + new Date(object?.published ?? new Date()).toLocaleTimeString('default', {hour: '2-digit', minute: '2-digit'});

    const [isClicked, setIsClicked] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    
    const handleLikeClick = (event: React.MouseEvent<HTMLElement> | undefined) => {
        event?.stopPropagation();
        setIsClicked(true);
        setIsLiked(!isLiked);
        setTimeout(() => setIsClicked(false), 300); // Reset the animation class after 300ms
    };

    return (
        <>
            {object && (
                <div className='border-1 group/article relative z-10 flex cursor-pointer flex-col items-start justify-between border-b border-b-grey-200 py-5' data-test-activity>
                    <div className='relative z-10 mb-3 grid w-full grid-cols-[20px_auto_1fr_auto] items-center gap-2 text-base'>
                        <img className='w-5' src='https://www.platformer.news/content/images/size/w256h256/2024/05/Logomark_Blue_800px.png'/>
                        <span className='truncate font-semibold'>{actor.name}</span>
                        <span className='truncate text-grey-800'>{getUsername(actor)}</span>
                        <span className='ml-auto text-right text-grey-800'>{timestamp}</span>
                    </div>
                    <div className='relative z-10 grid w-full grid-cols-[auto_170px] gap-4'>
                        <div className='flex flex-col'>
                            <div className='flex w-full justify-between gap-4'>
                                <Heading className='mb-2 line-clamp-2 leading-tight' level={5} data-test-activity-heading>{object.name}</Heading>
                            </div>
                            <p className='mb-6 line-clamp-2 max-w-prose text-md text-grey-800'>{plainTextContent}</p>
                            <div className='flex gap-2'>
                                <Button className={`self-start text-grey-500 transition-all hover:text-grey-800 ${isClicked ? 'bump' : ''} ${isLiked ? 'ap-red-heart text-red *:!fill-red hover:text-red' : ''}`} hideLabel={true} icon='heart' id="like" size='md' unstyled={true} onClick={handleLikeClick}/>
                                <span className={`text-grey-800 ${isLiked ? 'opacity-100' : 'opacity-0'}`}>1</span>
                            </div>
                        </div>
                        {object.image && <div className='relative min-w-[33%] grow'>
                            <img className='absolute h-full w-full rounded object-cover' src={object.image}/>
                        </div>}
                    </div>
                    <div className='absolute -inset-x-3 inset-y-0 z-0 rounded transition-colors group-hover/article:bg-grey-50'></div>
                    {/* <div className='absolute inset-0 z-0 rounded from-white to-grey-50 transition-colors group-hover/article:bg-gradient-to-r'></div> */}
                </div>
            )}
        </>
    );
};

const ViewArticle: React.FC<ViewArticleProps> = ({object, onBackToList}) => {
    const {updateRoute} = useRouting();

    const [isClicked, setIsClicked] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    
    const handleLikeClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        setIsClicked(true);
        setIsLiked(!isLiked);
        setTimeout(() => setIsClicked(false), 300); // Reset the animation class after 300ms
    };

    return (
        <Page>
            <ViewContainer
                toolbarBorder={false}
                type='page'
            >
                <div className='grid grid-cols-[1fr_minmax(320px,_700px)_1fr] gap-x-6 pb-4'>
                    <div>
                        <Button icon='chevron-left' iconSize='xs' label='Inbox' data-test-back-button onClick={onBackToList}/>
                    </div>
                    <div className='flex items-center justify-between'>
                        <span className='text-base font-semibold'>Placeholder</span>
                        <div className='flex flex-row-reverse gap-2'>
                            <Button className={`self-start text-grey-500 transition-all hover:text-grey-800 ${isClicked ? 'bump' : ''} ${isLiked ? 'ap-red-heart text-red *:!fill-red hover:text-red' : ''}`} hideLabel={true} icon='heart' id="like" size='md' unstyled={true} onClick={handleLikeClick}/>
                            <span className={`text-grey-800 ${isLiked ? 'opacity-100' : 'opacity-0'}`}>1</span>
                        </div>
                    </div>
                    <div className='flex justify-end'>
                        <Button icon='arrow-top-right' iconSize='xs' label='Visit site' onClick={() => updateRoute('/')}/>
                    </div>
                </div>
                <div className='-mx-[4.8rem] -mb-[4.8rem] w-auto'>
                    {/* <Heading className='mb-3' level={1} data-test-article-heading>{object.name}</Heading> */}
                    <ArticleBody heading={object.name} html={object.content} image={object?.image}/>
                </div>
            </ViewContainer>
        </Page>
    );
};

export default ActivityPubComponent;
