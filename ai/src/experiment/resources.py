"""학습·테스트 프로세스의 CPU/메모리 사용량을 측정합니다."""

import threading
import time
import psutil


class ResourceMonitor:
    """현재 프로세스 RSS를 20ms마다 샘플링합니다. CPU 시간은 스레드를 포함합니다."""

    def __enter__(self):
        """측정을 시작하고 백그라운드 샘플링 스레드를 띄웁니다."""
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
        """stop 이벤트가 켜질 때까지 peak RSS를 갱신합니다."""
        while not self.stop.wait(0.02):
            self.peak = max(self.peak, self.process.memory_info().rss)

    def __exit__(self, *args):
        """측정을 종료하고 result dict를 채웁니다."""
        self.stop.set()
        self.thread.join()
        cpu = self.process.cpu_times()
        seconds = time.perf_counter() - self.started
        cpu_seconds = cpu.user + cpu.system - self.cpu_start
        self.result = {
            "wall_seconds": seconds,
            "cpu_seconds": cpu_seconds,
            "cpu_percent_one_core": 100 * cpu_seconds / seconds if seconds else 0,
            "sampled_peak_rss_bytes": max(self.peak, self.process.memory_info().rss),
            "sampling_interval_ms": 20,
            "scope": "experiment process including native threads; not child processes",
        }
