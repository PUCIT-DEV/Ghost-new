import React, {useEffect, useRef} from 'react';

import NiceModal, {useModal} from '@ebay/nice-modal-react';
import {ActorProperties, ObjectProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Button, Modal} from '@tryghost/admin-x-design-system';
import {useBrowseSite} from '@tryghost/admin-x-framework/api/site';

import FeedItem from './FeedItem';
import MainHeader from '../navigation/MainHeader';

import articleBodyStyles from '../articleBodyStyles';
import {type Activity} from '../activities/ActivityItem';

interface ArticleModalProps {
    object: ObjectProperties;
    actor: ActorProperties;
    comments: Activity[];
    allComments: Map<string, Activity[]>;
}

const ArticleBody: React.FC<{heading: string, image: string|undefined, html: string}> = ({heading, image, html}) => {
    const site = useBrowseSite();
    const siteData = site.data?.site;

    const iframeRef = useRef<HTMLIFrameElement>(null);

    const cssContent = articleBodyStyles(siteData?.url.replace(/\/$/, ''));

    const htmlContent = `
  <html>
  <head>
    ${cssContent}
  </head>
  <body>
    <header class='gh-article-header gh-canvas'>
        <h1 class='gh-article-title is-title' data-test-article-heading>${heading}</h1>
${image &&
        `<figure class='gh-article-image'>
            <img src='${image}' alt='${heading}' />
        </figure>`
}
    </header>
    <div class='gh-content gh-canvas is-body'>
      ${html}
    </div>
  </body>
  </html>
`;

    useEffect(() => {
        const iframe = iframeRef.current;
        if (iframe) {
            iframe.srcdoc = htmlContent;
        }
    }, [htmlContent]);

    return (
        <div>
            <iframe
                ref={iframeRef}
                className={`h-[calc(100vh_-_3vmin_-_4.8rem_-_2px)]`}
                height='100%'
                id='gh-ap-article-iframe'
                title='Embedded Content'
                width='100%'
            >
            </iframe>
        </div>
    );
};

const FeedItemDivider: React.FC = () => (
    <div className="mx-[-32px] my-4 h-px w-[120%] bg-grey-200"></div>
);

const ArticleModal: React.FC<ArticleModalProps> = ({object, actor, comments, allComments}) => {
    const modal = useModal();
    return (
        <Modal
            align='right'
            animate={true}
            footer={<></>}
            height={'full'}
            padding={false}
            size='bleed'
            width={640}
        >
            <MainHeader>
                <div className='col-[1/2] flex items-center justify-between px-8'>
                    <Button icon='chevron-left' size='sm' unstyled onClick={() => modal.remove()}/>
                </div>
                <div className='col-[2/3] flex grow items-center justify-center px-8 text-center'>
                    <span className='text-lg font-semibold text-grey-900'>{object.type}</span>
                </div>
                <div className='col-[3/4] flex items-center justify-end px-8'>
                    <Button icon='close' size='sm' unstyled onClick={() => modal.remove()}/>
                </div>
            </MainHeader>
            <div className='mt-10 w-auto'>
                {object.type === 'Note' && (
                    <div className='mx-auto max-w-[580px]'>
                        <FeedItem
                            actor={actor}
                            comments={comments}
                            layout='modal'
                            object={object}
                            type='Note'
                        />
                        {/* {object.content && <div dangerouslySetInnerHTML={({__html: object.content})} className='ap-note-content text-pretty text-[1.5rem] text-grey-900'></div>} */}
                        {/* {renderAttachment(object)} */}
                        {/* <FeedItem actor={actor} last={false} layout='reply' object={object} type='Note'/>
                        <FeedItem actor={actor} last={true} layout='reply' object={object} type='Note'/>
                        <div className="mx-[-32px] my-4 h-px w-[120%] bg-grey-200"></div>
                        <FeedItem actor={actor} last={false} layout='reply' object={object} type='Note'/>
                        <FeedItem actor={actor} last={false} layout='reply' object={object} type='Note'/>
                        <FeedItem actor={actor} last={true} layout='reply' object={object} type='Note'/> */}
                        {comments.map((comment, index) => {
                            const showDivider = index !== comments.length - 1;
                            const nestedComments = allComments.get(comment.object.id) ?? [];
                            const hasNestedComments = nestedComments.length > 0;

                            return (
                                <>
                                    <FeedItem
                                        actor={comment.actor}
                                        comments={nestedComments}
                                        last={true}
                                        layout='reply'
                                        object={comment.object}
                                        type='Note'
                                    />
                                    {hasNestedComments && <FeedItemDivider />}
                                    {nestedComments.map((nestedComment, nestedCommentIndex) => (
                                        <FeedItem
                                            actor={nestedComment.actor}
                                            last={nestedComments.length === nestedCommentIndex + 1}
                                            layout='reply'
                                            object={nestedComment.object}
                                            type='Note'
                                        />
                                    ))}
                                    {showDivider && <FeedItemDivider />}
                                </>
                            );
                        })}
                    </div>
                )}
                {object.type === 'Article' && (
                    <ArticleBody heading={object.name} html={object.content} image={object?.image} />
                )}
            </div>
        </Modal>
    );
};

export default NiceModal.create(ArticleModal);
