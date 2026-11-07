import ast
import unittest
from pathlib import Path

SCREENS = Path(__file__).resolve().parent.parent / "game" / "screens.py"


def _defined(cls, classes, seen=None):
    seen = seen or set()
    if cls.name in seen:
        return set()
    seen.add(cls.name)
    names = set()
    for node in cls.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            names.add(node.name)
        elif isinstance(node, ast.Assign):
            names.update(t.id for t in node.targets if isinstance(t, ast.Name))
        elif isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name):
            names.add(node.target.id)
    for node in ast.walk(cls):
        targets = []
        if isinstance(node, ast.Assign):
            targets = node.targets
        elif isinstance(node, (ast.AnnAssign, ast.AugAssign)):
            targets = [node.target]
        elif isinstance(node, (ast.For, ast.comprehension)):
            targets = [node.target]
        for t in targets:
            for sub in ast.walk(t):
                if isinstance(sub, ast.Attribute) and isinstance(sub.value, ast.Name) and sub.value.id == "self":
                    names.add(sub.attr)
    for base in cls.bases:
        if isinstance(base, ast.Name) and base.id in classes:
            names |= _defined(classes[base.id], classes, seen)
    return names


class ScreenAttributesTests(unittest.TestCase):
    def test_every_self_attribute_exists_in_its_own_screen(self):
        tree = ast.parse(SCREENS.read_text(encoding="utf-8"))
        classes = {n.name: n for n in tree.body if isinstance(n, ast.ClassDef)}
        problems = []
        for cls in classes.values():
            if any(isinstance(b, ast.Name) and b.id not in classes and b.id != "object" for b in cls.bases):
                continue
            defined = _defined(cls, classes)
            for node in ast.walk(cls):
                if (isinstance(node, ast.Attribute) and isinstance(node.ctx, ast.Load)
                        and isinstance(node.value, ast.Name) and node.value.id == "self"
                        and node.attr not in defined):
                    problems.append("%s usa self.%s (linha %d), que não existe nela" % (cls.name, node.attr, node.lineno))
        self.assertEqual(problems, [])


if __name__ == "__main__":
    unittest.main()
