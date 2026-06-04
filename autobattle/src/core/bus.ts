import type { BusEvents } from '../types';

type Handler<T> = (payload: T) => void;

/** 极简类型化事件总线: 解耦战斗内/外与 UI. */
class Bus {
  private map = new Map<keyof BusEvents, Set<Handler<unknown>>>();

  on<K extends keyof BusEvents>(type: K, fn: Handler<BusEvents[K]>): () => void {
    let set = this.map.get(type);
    if (!set) {
      set = new Set();
      this.map.set(type, set);
    }
    set.add(fn as Handler<unknown>);
    return () => {
      this.map.get(type)?.delete(fn as Handler<unknown>);
    };
  }

  emit<K extends keyof BusEvents>(type: K, payload: BusEvents[K]): void {
    this.map.get(type)?.forEach((fn) => {
      try {
        fn(payload);
      } catch {
        /* 单个订阅者异常不影响其他 */
      }
    });
  }
}

export const bus = new Bus();
