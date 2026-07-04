"""
Parametric CAD generation for the wedding ring models.

Builds two rings entirely in code and exports GLBs for the website:

  public/models/engagement.glb   her ring: cathedral band with swept
                                 superellipse profile, three staggered
                                 micro-pave rows, six-claw prong head,
                                 marquise-following basket wires, and a
                                 marquise brilliant cut via convex hull
                                 of facet-tier vertices
  public/models/wedding_band.glb his ring: comfort-fit band with two
                                 staggered micro-pave rows

Conventions (matching the three.js scene):
  - band center radius = 1.0, band plane = XY, finger axis = Z
  - head sits at +Y; stone length runs along Z (as worn on a finger)

Meshes are named "metal", "pave", "gem" so the site can assign its
studio materials by name. Gems are exported with unmerged vertices for
hard facet normals; metal stays indexed for smooth shading.

Run:  python scripts/generate_rings.py
"""

import numpy as np
import trimesh

# ── Marquise lens outline (2:1), shared by stone / prongs / basket ────────

LENS_B = 0.5
LENS_R = (1 + LENS_B**2) / (2 * LENS_B)
LENS_D = np.sqrt(LENS_R**2 - 1)
LENS_TH = np.arcsin(1 / LENS_R)


def sample_lens(t):
    """Point on the lens perimeter, t in [0,1). Length along x, width z."""
    if t < 0.5:
        s = t / 0.5
        th = -LENS_TH + s * 2 * LENS_TH
        return LENS_R * np.sin(th), LENS_R * np.cos(th) - LENS_D
    s = (t - 0.5) / 0.5
    th = LENS_TH - s * 2 * LENS_TH
    return LENS_R * np.sin(th), -(LENS_R * np.cos(th) - LENS_D)


def lens_ring(scale, y, offset, n=32):
    pts = []
    for i in range(n):
        x, z = sample_lens(((i + offset) % n) / n)
        pts.append([x * scale, y, z * scale])
    return np.array(pts)


# ── Generic swept-surface builders ────────────────────────────────────────

def grid_mesh(verts_grid, wrap_u=True, wrap_v=True):
    """Triangulate an (M, P, 3) grid of vertices into a Trimesh."""
    M, P, _ = verts_grid.shape
    verts = verts_grid.reshape(-1, 3)
    faces = []
    mu = M if wrap_u else M - 1
    pv = P if wrap_v else P - 1
    for i in range(mu):
        i2 = (i + 1) % M
        for j in range(pv):
            j2 = (j + 1) % P
            a = i * P + j
            b = i2 * P + j
            c = i2 * P + j2
            d = i * P + j2
            faces.append([a, b, c])
            faces.append([a, c, d])
    mesh = trimesh.Trimesh(vertices=verts, faces=np.array(faces), process=True)
    mesh.fix_normals()
    return mesh


def sweep_tube(path, radii, n_seg=10):
    """Sweep a circle of varying radius along a 3D path.

    Frames via parallel transport so the tube doesn't twist. Ends are
    capped with center-point fans.
    """
    path = np.asarray(path, dtype=float)
    K = len(path)
    radii = np.maximum(np.asarray(radii, dtype=float), 1e-4)

    # tangents
    tangents = np.zeros_like(path)
    tangents[1:-1] = path[2:] - path[:-2]
    tangents[0] = path[1] - path[0]
    tangents[-1] = path[-1] - path[-2]
    tangents /= np.linalg.norm(tangents, axis=1, keepdims=True)

    # initial normal: any vector perpendicular to the first tangent
    t0 = tangents[0]
    trial = np.array([0.0, 1.0, 0.0])
    if abs(np.dot(trial, t0)) > 0.9:
        trial = np.array([1.0, 0.0, 0.0])
    n = trial - t0 * np.dot(trial, t0)
    n /= np.linalg.norm(n)

    rings = []
    for i in range(K):
        t = tangents[i]
        n = n - t * np.dot(n, t)  # parallel transport
        n /= np.linalg.norm(n)
        b = np.cross(t, n)
        theta = np.linspace(0, 2 * np.pi, n_seg, endpoint=False)
        ring = (
            path[i]
            + radii[i] * (np.outer(np.cos(theta), n) + np.outer(np.sin(theta), b))
        )
        rings.append(ring)
    grid = np.stack(rings)  # (K, n_seg, 3)

    verts = grid.reshape(-1, 3).tolist()
    faces = []
    for i in range(K - 1):
        for j in range(n_seg):
            j2 = (j + 1) % n_seg
            a = i * n_seg + j
            b2 = (i + 1) * n_seg + j
            c = (i + 1) * n_seg + j2
            d = i * n_seg + j2
            faces.append([a, b2, c])
            faces.append([a, c, d])
    # caps
    start_c = len(verts)
    verts.append(path[0].tolist())
    end_c = len(verts)
    verts.append(path[-1].tolist())
    for j in range(n_seg):
        j2 = (j + 1) % n_seg
        faces.append([start_c, j2, j])
        base = (K - 1) * n_seg
        faces.append([end_c, base + j, base + j2])

    mesh = trimesh.Trimesh(vertices=np.array(verts), faces=np.array(faces), process=True)
    mesh.fix_normals()
    return mesh


# ── Bands ─────────────────────────────────────────────────────────────────

def make_band(
    R=1.0,
    half_radial=0.10,
    half_axial=0.085,
    superellipse_n=3.0,
    cathedral_amp=0.0,
    cathedral_sigma=0.55,
    M=220,
    P=44,
):
    """Comfort-fit band: superellipse profile swept around Z.

    cathedral_amp > 0 swells the outer surface near the top (+Y) into
    rising shoulders that meet the head, narrowing axially as they climb.
    """
    grid = np.zeros((M, P, 3))
    for i in range(M):
        a = (i / M) * 2 * np.pi
        # gaussian bump centred at the top of the ring (a = pi/2)
        d = np.arctan2(np.sin(a - np.pi / 2), np.cos(a - np.pi / 2))
        bump = np.exp(-((d / cathedral_sigma) ** 2)) * cathedral_amp
        for j in range(P):
            th = (j / P) * 2 * np.pi
            c, s = np.cos(th), np.sin(th)
            px = half_radial * np.sign(c) * abs(c) ** (2 / superellipse_n)
            pz = half_axial * np.sign(s) * abs(s) ** (2 / superellipse_n)
            # swell outward only; pinch axially as the shoulder rises
            if px > 0:
                px = px + bump * (px / half_radial)
            pz = pz * (1 - 0.3 * (bump / max(cathedral_amp, 1e-9)) * (cathedral_amp > 0))
            radial = R + px
            grid[i, j] = [radial * np.cos(a), radial * np.sin(a), pz]
    return grid_mesh(grid)


def band_surface_point(a, phi, R=1.0, half_radial=0.10, half_axial=0.085,
                       cathedral_amp=0.0, cathedral_sigma=0.55):
    """Approximate point + outward normal on the band's outer surface."""
    d = np.arctan2(np.sin(a - np.pi / 2), np.cos(a - np.pi / 2))
    bump = np.exp(-((d / cathedral_sigma) ** 2)) * cathedral_amp
    radial = R + (half_radial + bump) * np.cos(phi)
    z = half_axial * np.sin(phi)
    p = np.array([radial * np.cos(a), radial * np.sin(a), z])
    nrm = np.array([np.cos(phi) * np.cos(a), np.cos(phi) * np.sin(a), np.sin(phi)])
    return p, nrm / np.linalg.norm(nrm)


# ── Gems ──────────────────────────────────────────────────────────────────

def make_marquise():
    """Marquise brilliant: convex hull of facet-tier vertices."""
    pts = [
        lens_ring(0.52, 0.30, 0),      # table edge
        lens_ring(0.66, 0.255, 0.5),   # star tier
        lens_ring(0.80, 0.19, 0),      # bezel tier
        lens_ring(0.94, 0.10, 0.5),    # upper girdle facets
        lens_ring(1.00, 0.035, 0),     # girdle top
        lens_ring(1.00, -0.035, 0),    # girdle bottom
        lens_ring(0.80, -0.22, 0.5),   # upper pavilion
        lens_ring(0.55, -0.50, 0),     # pavilion mains
    ]
    keel = np.array([[x, -0.82, 0.0] for x in np.linspace(-0.42, 0.42, 5)])
    cloud = np.vstack(pts + [keel])
    gem = trimesh.convex.convex_hull(cloud)
    gem.unmerge_vertices()  # hard facet normals
    return gem


def make_round_brilliant():
    """Tiny round brilliant for pave, unit girdle radius."""
    def circle(r, y, n, offset=0.0):
        th = (np.arange(n) + offset) / n * 2 * np.pi
        return np.stack([r * np.cos(th), np.full(n, y), r * np.sin(th)], axis=1)

    cloud = np.vstack([
        circle(0.52, 0.34, 8),
        circle(0.80, 0.20, 16, 0.5),
        circle(1.00, 0.0, 16),
        circle(0.60, -0.30, 8, 0.5),
        np.array([[0, -0.65, 0]]),
    ])
    gem = trimesh.convex.convex_hull(cloud)
    gem.unmerge_vertices()
    return gem


def orient_to_normal(normal):
    """Rotation matrix taking +Y to the given unit normal."""
    up = np.array([0.0, 1.0, 0.0])
    v = np.cross(up, normal)
    c = np.dot(up, normal)
    if np.linalg.norm(v) < 1e-8:
        return np.eye(3) if c > 0 else np.diag([1.0, -1.0, -1.0])
    vx = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    return np.eye(3) + vx + vx @ vx * (1 / (1 + c))


def make_pave(rows, per_row, stone_scale, band_kwargs):
    """Merged mesh of round brilliants seated girdle-flush on the band."""
    stone = make_round_brilliant()
    pieces = []
    for r_idx, phi in enumerate(rows):
        for i in range(per_row):
            a = ((i + (r_idx % 2) * 0.5) / per_row) * 2 * np.pi
            p, nrm = band_surface_point(a, phi, **band_kwargs)
            # sink so the girdle sits at the metal surface
            p = p - nrm * stone_scale * 0.05
            T = np.eye(4)
            T[:3, :3] = orient_to_normal(nrm) * stone_scale
            T[:3, 3] = p
            s = stone.copy()
            s.apply_transform(T)
            pieces.append(s)
    return trimesh.util.concatenate(pieces)


# ── Prong head + basket (built in gem-local space, then transformed) ──────

def gem_transform(scale=0.42, y=1.47):
    """Gem local (length x, up y) -> ring frame (length Z, head at +Y)."""
    T = np.eye(4)
    # rotate -90 deg about Y: x -> -z? We want length along Z: (x,y,z)->(z,y,-x)
    R = np.array([
        [0, 0, 1],
        [0, 1, 0],
        [-1, 0, 0],
    ], dtype=float)
    T[:3, :3] = R * scale
    T[:3, 3] = [0, y, 0]
    return T


def make_head():
    """Six tapered claw prongs + two lens-following basket wires."""
    T = gem_transform()
    pieces = []

    for t in [0.0, 0.5, 0.15, 0.35, 0.65, 0.85]:
        gx, gz = sample_lens(t)
        path = np.array([
            [gx * 1.00, -0.46, gz * 1.00],
            [gx * 1.15, -0.10, gz * 1.15],
            [gx * 1.16, 0.10, gz * 1.16],
            [gx * 0.98, 0.30, gz * 0.98],
            [gx * 0.80, 0.40, gz * 0.80],
        ])
        path = trimesh.transform_points(path, T)
        radii = np.array([0.085, 0.08, 0.075, 0.055, 0.001]) * 0.42
        pieces.append(sweep_tube(path, radii, n_seg=10))

    for scale, y, r in [(0.86, -0.24, 0.05), (0.60, -0.46, 0.045)]:
        n = 40
        path = []
        for i in range(n + 1):
            x, z = sample_lens((i % n) / n)
            path.append([x * scale, y, z * scale])
        path = trimesh.transform_points(np.array(path), T)
        pieces.append(sweep_tube(path, np.full(n + 1, r * 0.42 * 2.2), n_seg=8))

    return trimesh.util.concatenate(pieces)


# ── Assembly ──────────────────────────────────────────────────────────────

def main():
    out_dir = "public/models"
    import os
    os.makedirs(out_dir, exist_ok=True)

    # Her engagement ring
    her_band_kwargs = dict(
        R=1.0, half_radial=0.10, half_axial=0.085,
        cathedral_amp=0.13, cathedral_sigma=0.55,
    )
    her_band = make_band(**her_band_kwargs, superellipse_n=3.0)
    her_head = make_head()
    her_metal = trimesh.util.concatenate([her_band, her_head])

    her_pave = make_pave(
        rows=[-0.42, 0.0, 0.42], per_row=52, stone_scale=0.034,
        band_kwargs=her_band_kwargs,
    )

    gem = make_marquise()
    gem.apply_transform(gem_transform(scale=0.42, y=1.47))

    scene = trimesh.Scene()
    scene.add_geometry(her_metal, node_name="metal", geom_name="metal")
    scene.add_geometry(her_pave, node_name="pave", geom_name="pave")
    scene.add_geometry(gem, node_name="gem", geom_name="gem")
    scene.export(f"{out_dir}/engagement.glb")

    # His wedding band
    his_band_kwargs = dict(
        R=1.0, half_radial=0.11, half_axial=0.10,
        cathedral_amp=0.0, cathedral_sigma=0.55,
    )
    his_band = make_band(**his_band_kwargs, superellipse_n=3.4)
    his_pave = make_pave(
        rows=[-0.30, 0.30], per_row=44, stone_scale=0.036,
        band_kwargs=his_band_kwargs,
    )

    scene2 = trimesh.Scene()
    scene2.add_geometry(his_band, node_name="metal", geom_name="metal")
    scene2.add_geometry(his_pave, node_name="pave", geom_name="pave")
    scene2.export(f"{out_dir}/wedding_band.glb")

    for name, m in [
        ("engagement metal", her_metal), ("engagement pave", her_pave),
        ("gem", gem), ("band metal", his_band), ("band pave", his_pave),
    ]:
        print(f"{name:20s} {len(m.faces):7d} tris")
    import os.path as p
    for f in ["engagement.glb", "wedding_band.glb"]:
        print(f"{f:20s} {p.getsize(f'{out_dir}/{f}') / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
