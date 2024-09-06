import {ActivityPubAPI} from '../api/activitypub';
import {useBrowseSite} from '@tryghost/admin-x-framework/api/site';
import {useMutation, useQuery} from '@tanstack/react-query';

const useSiteUrl = () => {
    const site = useBrowseSite();
    return site.data?.site?.url ?? window.location.origin;
};

function createActivityPubAPI(handle: string, siteUrl: string) {
    return new ActivityPubAPI(
        new URL(siteUrl),
        new URL('/ghost/api/admin/identities/', window.location.origin),
        handle
    );
}

export function useLikedForUser(handle: string) {
    const siteUrl = useSiteUrl();
    const api = createActivityPubAPI(handle, siteUrl);
    return useQuery({
        queryKey: [`liked:${handle}`],
        async queryFn() {
            return api.getLiked();
        }
    });
}

export function useLikeMutationForUser(handle: string) {
    const siteUrl = useSiteUrl();
    const api = createActivityPubAPI(handle, siteUrl);
    return useMutation({
        mutationFn(id: string) {
            return api.like(id);
        }
    });
}

export function useUnlikeMutationForUser(handle: string) {
    const siteUrl = useSiteUrl();
    const api = createActivityPubAPI(handle, siteUrl);
    return useMutation({
        mutationFn(id: string) {
            return api.unlike(id);
        }
    });
}

export function useFollowersCountForUser(handle: string) {
    const siteUrl = useSiteUrl();
    const api = createActivityPubAPI(handle, siteUrl);
    return useQuery({
        queryKey: [`followersCount:${handle}`],
        async queryFn() {
            return api.getFollowersCount();
        }
    });
}

export function useFollowingCountForUser(handle: string) {
    const siteUrl = useSiteUrl();
    const api = createActivityPubAPI(handle, siteUrl);
    return useQuery({
        queryKey: [`followingCount:${handle}`],
        async queryFn() {
            return api.getFollowingCount();
        }
    });
}

export function useFollowingForUser(handle: string) {
    const siteUrl = useSiteUrl();
    const api = createActivityPubAPI(handle, siteUrl);
    return useQuery({
        queryKey: [`following:${handle}`],
        async queryFn() {
            return api.getFollowing();
        }
    });
}

export function useFollowersForUser(handle: string) {
    const siteUrl = useSiteUrl();
    const api = createActivityPubAPI(handle, siteUrl);

    return useQuery({
        queryKey: [`followers:${handle}`],
        async queryFn() {
            return api.getFollowers();
        }
    });
}
