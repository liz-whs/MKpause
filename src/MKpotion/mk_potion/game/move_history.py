from __future__ import annotations

from typing import Generic, List, Optional, TypeVar

T = TypeVar("T")


class MoveHistory(Generic[T]):

    def __init__(self) -> None:
        self._stack: List[T] = []

    def push(self, snapshot: T) -> None:
        self._stack.append(snapshot)

    def pop(self) -> Optional[T]:
        return self._stack.pop() if self._stack else None

    def clear(self) -> None:
        self._stack.clear()

    def can_undo(self) -> bool:
        return bool(self._stack)

    def __len__(self) -> int:
        return len(self._stack)
