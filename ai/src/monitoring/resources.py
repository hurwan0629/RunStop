import threading
import time
import psutil


class ResourceMonitor:
    """Sample current process RSS every 20ms; CPU seconds include process threads."""
    def __enter__(self):
        self.process = psutil.Process()
        self.started = time.perf_counter()
        cpu = self.process.cpu_times()
        self.cpu_start = cpu.user + cpu.system
        self.peak = self.process.memory_info().rss
        self.stop = threading.Event()
        self.thread = threading.Thread(target=self._sample, daemon=True)
        self.thread.start()
        return self

    def _sample(self):
        while not self.stop.wait(0.02):
            self.peak = max(self.peak, self.process.memory_info().rss)

    def __exit__(self, *args):
        self.stop.set()
        self.thread.join()
        cpu = self.process.cpu_times()
        seconds = time.perf_counter() - self.started
        cpu_seconds = cpu.user + cpu.system - self.cpu_start
        self.result = {"wall_seconds": seconds, "cpu_seconds": cpu_seconds,
                       "cpu_percent_one_core": 100 * cpu_seconds / seconds if seconds else 0,
                       "sampled_peak_rss_bytes": max(self.peak, self.process.memory_info().rss),
                       "sampling_interval_ms": 20, "scope": "experiment process including native threads; not child processes"}
