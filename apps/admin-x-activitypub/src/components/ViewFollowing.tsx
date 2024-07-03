import {} from '@tryghost/admin-x-framework/api/activitypub';
import NiceModal from '@ebay/nice-modal-react';
import getUsername from '../utils/get-username';
import {Avatar, Button, List, ListItem, Modal} from '@tryghost/admin-x-design-system';
import {FollowingResponseData, useBrowseFollowingForUser, useUnfollow} from '@tryghost/admin-x-framework/api/activitypub';
import {RoutingModalProps, useRouting} from '@tryghost/admin-x-framework/routing';

interface ViewFollowingModalProps {
    following: FollowingResponseData[],
    animate?: boolean
}

const ViewFollowingModal: React.FC<RoutingModalProps & ViewFollowingModalProps> = ({}) => {
    const {updateRoute} = useRouting();
    const mutation = useUnfollow();

    const {data: {items = []} = {}} = useBrowseFollowingForUser('inbox');

    const following = Array.isArray(items) ? items : [items];
    return (
        <Modal
            afterClose={() => {
                mutation.reset();
                updateRoute('');
            }}
            cancelLabel=''
            footer={false}
            okLabel=''
            size='md'
            title='Following'
            topRightContent='close'
        >
            <div className='mt-3 flex flex-col gap-4 pb-12'>
                <List>
                    {following.map(item => (
                        <ListItem action={<Button color='grey' label='Unfollow' link={true} onClick={() => mutation.mutate({username: getUsername(item)})} />} avatar={<Avatar image={item.icon} size='sm' />} detail={getUsername(item)} id='list-item' title={item.name}></ListItem>
                    ))}
                </List>
                {/* <Table>
                    <TableRow>
                        <TableCell>
                            <div className='group flex items-center gap-3 hover:cursor-pointer'>
                                <div className={`flex grow flex-col`}>
                                    <div className="mb-0.5 flex items-center gap-3">
                                        <img className='w-5' src='https://www.platformer.news/content/images/size/w256h256/2024/05/Logomark_Blue_800px.png'/>
                                        <span className='line-clamp-1 font-medium'>Platformer Platformer Platformer Platformer Platformer</span>
                                        <span className='line-clamp-1'>@index@platformerplatformerplatformerplatformer.news</span>
                                    </div>
                                </div>
                            </div>
                        </TableCell>
                        <TableCell className='w-[1%] whitespace-nowrap'><div className='mt-1 whitespace-nowrap text-right text-sm text-grey-700'>Unfollow</div></TableCell>
                    </TableRow>
                </Table> */}
            </div>
        </Modal>
    );
};

export default NiceModal.create(ViewFollowingModal);
