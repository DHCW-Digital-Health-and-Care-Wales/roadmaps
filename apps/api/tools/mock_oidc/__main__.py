"""Module entrypoint `python -m tools.mock_oidc`."""

import sys

from tools.mock_oidc.server import main

sys.exit(main())
