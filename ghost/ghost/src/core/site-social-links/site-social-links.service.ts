import {Inject} from '@nestjs/common';
import {SiteSocialLinkRepository} from './site-social-links.repository';
import {Actor} from '../../common/types/actor.type';
import {SiteSocialLink} from './site-social-link.entity';
import ObjectID from 'bson-objectid';
export class SiteSocialLinksService {
    constructor(
        @Inject('SiteSocialLinkRepository') private repository: SiteSocialLinkRepository
    ) {}

    async createSiteSocialLink(name: string, placeholder: string | null, icon: string | URL, actor?: Actor) {
        const field = SiteSocialLink.create({name, placeholder, icon}, actor);

        await this.repository.save(field);

        return field;
    }

    async updateSiteSocialLink(id: ObjectID, value: string | URL): Promise<SiteSocialLink> {
        const socialLink = await this.repository.getById(id);
        if (!socialLink) {
            throw new Error('Could not find it');
        }
        socialLink.value = value;
        await this.repository.save(socialLink);
        return socialLink;
    }

    async getAll() {
        return await this.repository.getAll();
    }
}
