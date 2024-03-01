import {Inject} from '@nestjs/common';
import {CustomFieldRepository} from './custom-field.repository';
import {CustomField} from './custom-field.entity';
import {Actor} from '../../common/types/actor.type';

export class CustomFieldService {
    constructor(
        @Inject('CustomFieldRepository') private repository: CustomFieldRepository
    ) {}

    async create(data: unknown, actor?: Actor) {
        const field = CustomField.create(data, actor);

        await this.repository.save(field);

        return field;
    }

    async getAll() {
        return await this.repository.getAll();
    }
}
