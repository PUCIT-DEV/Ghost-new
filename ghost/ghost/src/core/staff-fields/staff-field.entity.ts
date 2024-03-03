import ObjectID from 'bson-objectid';
import {Entity} from '../../common/entity.base';
import {CustomField} from './custom-field.entity';
import {SocialLink} from './social-link.entity';

type StaffFieldData = {
    staffId: ObjectID;
    field: SocialLink | CustomField;
    value: URL | string | boolean | null;
};

export class StaffField extends Entity<StaffFieldData> {
    get staffId() {
        return this.attr.staffId;
    }

    get field() {
        return this.attr.field;
    }

    get value() {
        return this.attr.value;
    }

    static create(data: unknown) {
        if (typeof data !== 'object' || data === null) {
            throw new Error('Invalid data');
        }

        const field = 'field' in data ? data.field : null;

        if (!(field instanceof SocialLink) && !(field instanceof CustomField)) {
            throw new Error('StaffField field must be a SocialLink or CustomField');
        }

        const inputValue = 'value' in data ? data.value : null;

        const value = field.validate(inputValue) as URL | string | boolean | null;

        let staffId = 'staffId' in data ? data.staffId : null;

        if (typeof staffId === 'string') {
            staffId = ObjectID.createFromHexString(staffId);
        }

        if (!(staffId instanceof ObjectID)) {
            throw new Error('StaffField staff id must be a valid id');
        }

        return new StaffField({
            staffId,
            field,
            value
        });
    }
}
