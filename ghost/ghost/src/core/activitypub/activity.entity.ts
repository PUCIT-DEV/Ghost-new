import {Entity} from '../../common/entity.base';
import ObjectID from 'bson-objectid';
import {Actor} from './actor.entity';
import {Article} from './article.object';
import {ActivityPub} from './types';
import {URI} from './uri.object';

type ActivityData = {
    activity: URI | null;
    type: ActivityPub.ActivityType;
    actor: {
        id: URI;
        type: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [x: string]: any;
    } | Actor;
    object: {
        id: URI;
        type: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [x: string]: any;
    } | Article;
    to: URI | null;
    updatedAt?: Date;
}

type CreateActivityData = ActivityData & {
    id? : ObjectID,
    createdAt: Date;
};

function getURI(input: unknown) {
    if (input instanceof URI) {
        return input;
    }
    if (typeof input === 'string') {
        return new URI(input);
    }
    if (typeof input !== 'object' || input === null) {
        throw new Error(`Could not create URI from ${JSON.stringify(input)}`);
    }
    if ('id' in input && typeof input.id === 'string') {
        return new URI(input.id);
    }
    throw new Error(`Could not create URI from ${JSON.stringify(input)}`);
}

function checkKeys<T extends string>(keys: T[], obj: object): Record<T, unknown> {
    for (const key of keys) {
        if (!(key in obj)) {
            throw new Error(`Missing key ${key}`);
        }
    }
    return obj as Record<T, unknown>;
}

export class Activity extends Entity<ActivityData> {
    get type() {
        return this.attr.type;
    }

    getObject(url: URL) {
        if (this.attr.object instanceof Article) {
            return this.attr.object.getJSONLD(url);
        }
        return this.attr.object;
    }

    getActor(url: URL) {
        if (this.attr.actor instanceof Actor) {
            return this.attr.actor.getJSONLD(url);
        }
        return this.attr.actor;
    }

    get actorId() {
        if (this.attr.actor instanceof Actor) {
            return this.attr.actor.actorId;
        }
        return this.attr.actor.id;
    }

    get objectId() {
        if (this.attr.object instanceof Article) {
            return this.attr.object.objectId;
        }
        return this.attr.object.id;
    }

    get activityId() {
        return this.attr.activity;
    }

    get to() {
        return this.attr.to;
    }

    toJSON(): object {
        return {
            id: this.attr.id,
            type: this.attr.type,
            actor: this.attr.actor,
            object: this.attr.object,
            to: this.attr.to
        };
    }

    getJSONLD(url: URL): ActivityPub.Activity {
        const object = this.getObject(url);
        const actor = this.getActor(url);
        return {
            '@context': 'https://www.w3.org/ns/activitystreams',
            id: this.activityId?.getValue(url) || null,
            type: this.attr.type,
            actor: {
                ...actor,
                id: this.actorId.getValue(url)
            },
            object: {
                ...object,
                id: this.objectId.getValue(url)
            },
            to: this.attr.to?.getValue(url) || null
        };
    }

    static fromJSONLD(json: object) {
        const parsed = checkKeys(['type', 'actor', 'object'], json);
        if (typeof parsed.type !== 'string' || !['Create', 'Follow', 'Accept'].includes(parsed.type)) {
            throw new Error(`Unknown type ${parsed.type}`);
        }
        return new Activity({
            activity: 'id' in json && typeof json.id === 'string' ? getURI(json.id) : null,
            type: parsed.type as ActivityPub.ActivityType,
            actor: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ...(parsed.actor as any),
                id: getURI(parsed.actor)
            },
            object: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ...(parsed.object as any),
                id: getURI(parsed.object)
            },
            to: 'to' in json ? getURI(json.to) : null
        });
    }

    static create(data: Partial<CreateActivityData>) {
        if (!data.actor) {
            throw new Error('Missing actor');
        }

        if (!data.object) {
            throw new Error('Missing object');
        }

        const actor = data.actor instanceof Actor
            ? data.actor
            : {
                ...(data.actor as any), // eslint-disable-line @typescript-eslint/no-explicit-any
                id: getURI(data.actor.id)
            };
        const obj = data.object instanceof Article
            ? data.object
            : {
                ...(data.object as any), // eslint-disable-line @typescript-eslint/no-explicit-any
                id: getURI(data.object.id)
            };

        const createdAt = validateDate(data.createdAt);
        const updatedAt = validateDate(data.updatedAt);

        return new Activity({
            id: data.id instanceof ObjectID ? data.id : new ObjectID(),
            activity: data.activity ? getURI(data.activity) : null,
            type: data.type || 'Create',
            actor: actor,
            object: obj,
            to: data.to ? getURI(data.to) : null,
            updatedAt,
            createdAt
        });
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validateDate(value: any): Date {
    let date: Date;

    if (!value) {
        return new Date();
    }

    if (value instanceof Date) {
        return value;
    } else if (value) {
        date = new Date(value);
        if (isNaN(date.valueOf())) {
            throw new Error('Invalid Date');
        }
    } else {
        date = new Date();
    }

    return date;
}

const data = {
    inbox: [
        {
            attr: {
                id: '664d30858dbfa941c19d522d', to: 'https://0a2e-129-222-88-174.ngrok-free.app/activitypub/actor/deadbeefdeadbeefdeadbeef', type: 'Accept', actor: {id: 'https://main.ghost.org/activitypub/actor/deadbeefdeadbeefdeadbeef', url: 'https://main.ghost.org/activitypub/actor/deadbeefdeadbeefdeadbeef', icon: '', name: 'The Main', type: 'Person', image: '', inbox: 'https://main.ghost.org/activitypub/inbox/deadbeefdeadbeefdeadbeef', outbox: 'https://main.ghost.org/activitypub/outbox/deadbeefdeadbeefdeadbeef', summary: 'The bio for the actor', '@context': ['https://www.w3.org/ns/activitystreams', 'https://w3id.org/security/v1', {featured: {'@id': 'http://joinmastodon.org/ns#featured', '@type': '@id'}}, {discoverable: {'@id': 'http://joinmastodon.org/ns#discoverable', '@type': '@id'}}, {manuallyApprovesFollowers: {'@id': 'http://joinmastodon.org/ns#manuallyApprovesFollowers', '@type': '@id'}}, {value: 'schema:value', schema: 'http://schema.org#', PropertyValue: 'schema:PropertyValue'}], featured: 'https://main.ghost.org/activitypub/featured/deadbeefdeadbeefdeadbeef', followers: 'https://main.ghost.org/activitypub/followers/deadbeefdeadbeefdeadbeef', following: 'https://main.ghost.org/activitypub/following/deadbeefdeadbeefdeadbeef', publicKey: {id: 'https://main.ghost.org/activitypub/actor/deadbeefdeadbeefdeadbeef#main-key', owner: 'https://main.ghost.org/activitypub/actor/deadbeefdeadbeefdeadbeef', publicKeyPem: '-----BEGIN RSA PUBLIC KEY-----\nMIGJAoGBANRpUrwk7x7bJDddHmrYSWVw9enVPMFm5qAW7fTgoZ7x2PoJUIqy/bkqpXZ0SmZs\nsLO3UZm+yN/DqxioD8BnhhD0N8Ydv6+UniT7hE2tHvsMxQIq2jet1auSBZNFmUIWodsBxI/R\ntm+KwFBFk+P+MvVsGZ2K3Rkd4K0dv0/45dtXAgMBAAE=\n-----END RSA PUBLIC KEY-----\n'}, published: '1970-01-01T00:00:00Z', attachment: [{name: 'Website', type: 'PropertyValue', value: '<a href=\'https://main.ghost.org/activitypub/\'>main.ghost.org</a>'}], discoverable: true, preferredUsername: 'index', manuallyApprovesFollowers: false}, object: {id: 'https://0a2e-129-222-88-174.ngrok-free.app/activitypub/activity/664d30788dbfa941c19d522b', type: 'Follow'}, deleted: false, activity: 'https://main.ghost.org/activitypub/activity/664d3085fd27b20001a76d81', createdAt: '2024-05-21T23:38:45.000Z', createdBy: {id: 'd34d01d0d34d01d0d34d01d0', role: 'Owner', type: 'user'}
            },
            events: []
        }
    ],
    outbox: [],
    features: [],
    username: 'index',
    followers: [],
    following: [
        {id: 'https://main.ghost.org/activitypub/actor/deadbeefdeadbeefdeadbeef', username: '@index@main.ghost.org'}
    ],
    displayName: 'My Site'
};
