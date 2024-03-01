import {Module} from '@nestjs/common';
import {ExampleController} from '../../http/admin/controllers/example.controller';
import {ExampleService} from '../../core/example/example.service';
import {ExampleRepositoryInMemory} from '../../db/in-memory/example.repository.in-memory';
import {CustomFieldService} from '../../core/staff-custom-fields/custom-field.service';
import {CustomFieldRepositoryInMemory} from '../../db/in-memory/custom-field.repository.in-memory';
import {CustomFieldsController} from '../../http/admin/controllers/custom-fields.controller';

@Module({
    controllers: [ExampleController, CustomFieldsController],
    exports: [ExampleService, CustomFieldService],
    providers: [
        ExampleService,
        {
            provide: 'ExampleRepository',
            useClass: ExampleRepositoryInMemory
        },
        CustomFieldService,
        {
            provide: 'CustomFieldRepository',
            useClass: CustomFieldRepositoryInMemory
        }
    ]
})
export class AdminAPIModule {}
