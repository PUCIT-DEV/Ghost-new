import 'reflect-metadata';
import {AppModule} from './nestjs/modules/app.module';
import {NestApplication, NestFactory} from '@nestjs/core';
import {registerEvents} from './common/decorators/handle-event.decorator';
import {ClassProvider, ValueProvider} from '@nestjs/common';

let app: any;

export async function create() {
    app = await NestFactory.create(AppModule);
    const DomainEvents = await app.resolve('DomainEvents');
    registerEvents(app as NestApplication, DomainEvents);
    return app;
}

export async function getApp() {
    if (app) {
        return app;
    }
    app = await create();
    await app.init();
    return app;
}

export async function resolve(token: any) {
    return await app.resolve(token);
}

export function addProvider(obj: ClassProvider | ValueProvider) {
    AppModule.providers?.push(obj);
    AppModule.exports?.push(obj.provide);
}

export {
    AppModule
};
