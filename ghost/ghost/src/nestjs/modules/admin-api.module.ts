import {Module} from '@nestjs/common';
import {ExampleController} from '../../http/admin/controllers/example.controller';
import {ExampleService} from '../../core/example/example.service';
import {ExampleRepositoryInMemory} from '../../db/in-memory/example.repository.in-memory';
import {StaffFieldService} from '../../core/staff-fields/staff-field.service';
import {CustomFieldRepositoryInMemory} from '../../db/in-memory/field.repository.in-memory';
import {CustomFieldsController} from '../../http/admin/controllers/custom-fields.controller';
import {SocialLinksController} from '../../http/admin/controllers/social-links.controller';
import {StaffFieldRepositoryInMemory} from '../../db/in-memory/staff-field.repository.in-memory';
import {SiteSocialLinkRepositoryInMemory} from '../../db/in-memory/site-social-links.repository.in-memory';
import {SiteSocialLinksService} from '../../core/site-social-links/site-social-links.service';
import {SiteSocialLinksController} from '../../http/admin/controllers/site-social-links.controller';

@Module({
    controllers: [ExampleController, CustomFieldsController, SocialLinksController, SiteSocialLinksController],
    exports: [ExampleService, StaffFieldService],
    providers: [
        ExampleService,
        {
            provide: 'ExampleRepository',
            useClass: ExampleRepositoryInMemory
        },
        StaffFieldService,
        {
            provide: 'StaffFieldService',
            useClass: StaffFieldService
        },
        {
            provide: 'StaffFieldRepository',
            useClass: StaffFieldRepositoryInMemory
        },
        {
            provide: 'FieldRepository',
            useClass: CustomFieldRepositoryInMemory
        },
        {
            provide: 'SiteSocialLinkRepository',
            useClass: SiteSocialLinkRepositoryInMemory
        },
        SiteSocialLinksService,
        {
            provide: 'SiteSocialLinksService',
            useClass: SiteSocialLinksService
        }
    ]
})

export class AdminAPIModule {}
