import {Collection} from './Collection';
import {CollectionRepository} from './CollectionRepository';

type CollectionsServiceDeps = {
    collectionsRepository: CollectionRepository;
};

type CollectionPostDTO = {
    id: string;
    sort_order: number;
};

type ManualCollection = {
    title: string;
    type: 'manual';
    slug?: string;
    description?: string;
    featureImage?: string;
    filter?: null;
};

type AutomaticCollection = {
    title: string;
    type: 'automatic';
    filter: string;
    slug?: string;
    description?: string;
    featureImage?: string;
};

type CollectionInputDTO = ManualCollection | AutomaticCollection;

type CollectionDTO = {
    id: string;
    title: string | null;
    slug: string;
    description: string | null;
    feature_image: string | null;
    type: 'manual' | 'automatic';
    filter: string | null;
    created_at: Date;
    updated_at: Date | null;
    posts: CollectionPostDTO[];
};

type CollectionPostInputDTO = {
    id: string;
    featured: boolean;
    published_at: Date;
};

export class CollectionsService {
    collectionsRepository: CollectionRepository;
    constructor(deps: CollectionsServiceDeps) {
        this.collectionsRepository = deps.collectionsRepository;
    }

    toDTO(collection: Collection): CollectionDTO {
        return {
            id: collection.id,
            title: collection.title || null,
            slug: collection.slug,
            description: collection.description || null,
            feature_image: collection.featureImage || null,
            type: collection.type,
            filter: collection.filter,
            created_at: collection.createdAt,
            updated_at: collection.updatedAt,
            posts: collection.posts.map((postId, index) => ({
                id: postId,
                sort_order: index
            }))
        };
    }

    async createCollection(data: CollectionInputDTO): Promise<CollectionDTO> {
        const collection = await Collection.create({
            title: data.title,
            slug: data.slug,
            description: data.description,
            type: data.type,
            filter: data.filter,
            featureImage: data.featureImage
        });

        await this.collectionsRepository.save(collection);

        return this.toDTO(collection);
    }

    async addPostToCollection(collectionId: string, post: CollectionPostInputDTO): Promise<CollectionDTO | null> {
        const collection = await this.collectionsRepository.getById(collectionId);

        if (!collection) {
            return null;
        }

        collection.addPost(post);

        this.collectionsRepository.save(collection);

        return this.toDTO(collection);
    }

    async edit(data: any): Promise<Collection | null> {
        const collection = await this.collectionsRepository.getById(data.id);

        if (!collection) {
            return null;
        }

        if (data.posts) {
            for (const post of data.posts) {
                collection.addPost(post);
            }
        }

        if (data.title) {
            collection.title = data.title;
        }

        if (data.description) {
            collection.description = data.description;
        }

        await this.collectionsRepository.save(collection);

        return collection;
    }

    async getById(id: string): Promise<Collection | null> {
        return await this.collectionsRepository.getById(id);
    }

    async getAll(options?: any): Promise<{data: Collection[], meta: any}> {
        const collections = await this.collectionsRepository.getAll(options);

        return {
            data: collections,
            meta: {
                pagination: {
                    page: 1,
                    pages: 1,
                    limit: collections.length,
                    total: collections.length,
                    prev: null,
                    next: null
                }
            }
        };
    }

    async destroy(id: string): Promise<Collection | null> {
        const collection = await this.getById(id);

        if (collection) {
            collection.deleted = true;
            await this.collectionsRepository.save(collection);
        }

        return collection;
    }
}
