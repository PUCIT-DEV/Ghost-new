import {Config} from '../types/api';
import {createQuery} from '../utils/apiRequests';

export interface ConfigResponseType {
    config: Config;
}

const dataType = 'ConfigResponseType';

export const useBrowseConfig = createQuery<ConfigResponseType>({
    dataType,
    path: '/config/'
});
