import { EventEmitter } from 'node:events';

export class EventManager extends EventEmitter {
   constructor() {
      super();
      this.setMaxListeners(100);
   }
}

export default EventManager;
