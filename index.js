// Shim must be imported first for polyfills
import './shim';

import { registerRootComponent } from 'expo';
import App from './src/App';

registerRootComponent(App);
