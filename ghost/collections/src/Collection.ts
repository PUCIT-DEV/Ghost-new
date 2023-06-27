import {ValidationError} from '@tryghost/errors';
import tpl from '@tryghost/tpl';
import nql = require('@tryghost/nql');

import ObjectID from 'bson-objectid';

const messages = {
    invalidIDProvided: 'Invalid ID provided for Collection',
    invalidDateProvided: 'Invalid date provided for {fieldName}',
    invalidFilterProvided: {
        message: 'Invalid filter provided for automatic Collection',
        context: 'Automatic type of collection should always have a filter value'
    }
};

type CollectionPost = {
    id: string;
    featured?: boolean;
    published_at?: Date;
}

export class Collection {
    id: string;
    title: string;
    slug: string;
    description: string;
    type: 'manual' | 'automatic';
    filter: string | null;
    featureImage: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletable: boolean;
    _deleted: boolean = false;

    _posts: string[];
    get posts() {
        return this._posts;
    }

    public get deleted() {
        return this._deleted;
    }

    public set deleted(value: boolean) {
        if (this.deletable) {
            this._deleted = value;
        }
    }

    public edit(data: Partial<Collection>) {
        if (this.type === 'automatic' && (data.filter === null || data.filter === '')) {
            throw new ValidationError({
                message: tpl(messages.invalidFilterProvided.message),
                context: tpl(messages.invalidFilterProvided.context)
            });
        }

        if (data.title !== undefined) {
            this.title = data.title;
        }

        if (data.slug !== undefined) {
            this.slug = data.slug;
        }

        if (data.description !== undefined) {
            this.description = data.description;
        }

        if (data.filter !== undefined) {
            this.filter = data.filter;
        }

        if (data.featureImage !== undefined) {
            this.featureImage = data.featureImage;
        }

        return this;
    }

    /**
     * @param post {{id: string}} - The post to add to the collection
     * @param index {number} - The index to insert the post at, use negative numbers to count from the end.
     */
    addPost(post: CollectionPost, index: number = -0) {
        if (this.type === 'automatic') {
            const filterNql = nql(this.filter);
            const matchesFilter = filterNql.queryJSON(post);

            if (!matchesFilter) {
                return false;
            }
        }

        if (this.posts.includes(post.id)) {
            this._posts = this.posts.filter(id => id !== post.id);
        }

        if (index < 0 || Object.is(index, -0)) {
            index = this.posts.length + index;
        }

        this.posts.splice(index, 0, post.id);
        return true;
    }

    removePost(id: string) {
        if (this.posts.includes(id)) {
            this._posts = this.posts.filter(postId => postId !== id);
        }
    }

    includesPost(id: string) {
        return this.posts.includes(id);
    }

    removeAllPosts() {
        this._posts = [];
    }

    private constructor(data: any) {
        this.id = data.id;
        this.title = data.title;
        this.slug = data.slug;
        this.description = data.description;
        this.type = data.type;
        this.filter = data.filter;
        this.featureImage = data.featureImage;
        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
        this.deletable = data.deletable;
        this.deleted = data.deleted;
        this._posts = data.posts;
    }

    toJSON() {
        return {
            id: this.id,
            title: this.title,
            slug: this.slug,
            description: this.description,
            type: this.type,
            filter: this.filter,
            featureImage: this.featureImage,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            posts: this.posts
        };
    }

    static validateDateField(date: any, fieldName: string): Date {
        if (!date) {
            return new Date();
        }

        if (date instanceof Date) {
            return date;
        }

        throw new ValidationError({
            message: tpl(messages.invalidDateProvided, {fieldName})
        });
    }

    static async create(data: any): Promise<Collection> {
        let id;

        if (!data.id) {
            id = new ObjectID();
        } else if (typeof data.id === 'string') {
            id = ObjectID.createFromHexString(data.id);
        } else if (data.id instanceof ObjectID) {
            id = data.id;
        } else {
            throw new ValidationError({
                message: tpl(messages.invalidIDProvided)
            });
        }

        if (data.type === 'automatic' && !data.filter) {
            // @NOTE: add filter validation here
            throw new ValidationError({
                message: tpl(messages.invalidFilterProvided.message),
                context: tpl(messages.invalidFilterProvided.context)
            });
        }

        return new Collection({
            id: id.toHexString(),
            title: data.title,
            slug: data.slug,
            description: data.description || null,
            type: data.type || 'manual',
            filter: data.filter || null,
            featureImage: data.feature_image || null,
            createdAt: Collection.validateDateField(data.created_at, 'created_at'),
            updatedAt: Collection.validateDateField(data.updated_at, 'updated_at'),
            deleted: data.deleted || false,
            deletable: (data.deletable !== false),
            posts: data.posts || []
        });
    }
}
