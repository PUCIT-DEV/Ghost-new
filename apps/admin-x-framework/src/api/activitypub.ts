import {createMutation, createQueryWithId} from '../utils/api/hooks';

export type FollowItem = {
    id: string;
    username: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [x: string]: any
};

export type ObjectProperties = {
    '@context': string | (string | object)[];
    type: 'Article' | 'Link';
    name: string;
    content: string;
    url?: string | undefined;
    attributedTo?: string | object[] | undefined;
    image?: string;
    published?: string;
    preview?: {type: string, content: string};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [x: string]: any;
}

export type ActorProperties = {
    '@context': string | (string | object)[];
    attachment: object[];
    discoverable: boolean;
    featured: string;
    followers: string;
    following: string;
    id: string | null;
    image: string;
    inbox: string;
    manuallyApprovesFollowers: boolean;
    name: string;
    outbox: string;
    preferredUsername: string;
    publicKey: {
        id: string;
        owner: string;
        publicKeyPem: string;
    };
    published: string;
    summary: string;
    type: 'Person';
    url: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [x: string]: any;
}

export type Activity = {
    '@context': string;
    id: string;
    type: string;
    actor: ActorProperties;
    object: ObjectProperties;
    to: string;
}

export type InboxResponseData = {
    '@context': string;
    id: string;
    summary: string;
    type: 'OrderedCollection';
    totalItems: number;
    orderedItems: Activity[];
}

export type FollowingResponseData = {
    '@context': string;
    id: string;
    summary: string;
    type: string;
    totalItems: number;
    orderedItems: FollowItem[];
}

type FollowRequestProps = {
    username: string
}

export const useFollow = createMutation<object, FollowRequestProps>({
    method: 'POST',
    path: data => `/activitypub/follow/${data.username}`
});

export const useUnfollow = createMutation<object, FollowRequestProps>({
    method: 'POST',
    path: data => `/activitypub/unfollow/${data.username}`
});

// This is a frontend root, not using the Ghost admin API
export const useBrowseInboxForUser = createQueryWithId<InboxResponseData>({
    dataType: 'InboxResponseData',
    useActivityPub: true,
    path: id => `/inbox/${id}`
});

// This is a frontend root, not using the Ghost admin API
export const useBrowseFollowingForUser = createQueryWithId<FollowingResponseData>({
    dataType: 'FollowingResponseData',
    useActivityPub: true,
    path: id => `/following/${id}`
});
