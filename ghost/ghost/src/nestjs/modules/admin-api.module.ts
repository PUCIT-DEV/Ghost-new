import {Module} from '@nestjs/common';
import {ExampleController} from '../../http/admin/controllers/example.controller';
import {ExampleService} from '../../core/example/example.service';
import {ExampleRepositoryInMemory} from '../../db/in-memory/example.repository.in-memory';
import {StaffFieldService} from '../../core/staff-fields/staff-field.service';
import {CustomFieldRepositoryInMemory} from '../../db/in-memory/custom-field.repository.in-memory';
import {CustomFieldsController} from '../../http/admin/controllers/custom-fields.controller';
import {SocialLinksController} from '../../http/admin/controllers/social-links.controller';

@Module({
    controllers: [ExampleController, CustomFieldsController, SocialLinksController],
    exports: [ExampleService, StaffFieldService],
    providers: [
        ExampleService,
        {
            provide: 'ExampleRepository',
            useClass: ExampleRepositoryInMemory
        },
        StaffFieldService,
        {
            provide: 'StaffFieldRepository',
            useClass: CustomFieldRepositoryInMemory
        }
    ]
})
export class AdminAPIModule {}
