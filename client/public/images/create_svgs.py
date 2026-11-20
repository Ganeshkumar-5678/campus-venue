import os

img_dir = r'C:\Users\ELCOT\.gemini\antigravity\scratch\drbccc-campus-venue\client\public\images'

def make_venue_svg(title, color1, color2):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:{color1};stop-opacity:1" />
      <stop offset="100%" style="stop-color:{color2};stop-opacity:1" />
    </linearGradient>
    <radialGradient id="stageGlow" cx="50%" cy="40%" r="60%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.2" />
      <stop offset="100%" style="stop-color:#000000;stop-opacity:0.6" />
    </radialGradient>
  </defs>
  <rect width="800" height="500" fill="url(#grad)" />
  <rect width="800" height="500" fill="url(#stageGlow)" />
  
  <!-- Architectural lines -->
  <path d="M 100 500 L 250 250 L 550 250 L 700 500 Z" fill="#ffffff" fill-opacity="0.08" />
  <ellipse cx="400" cy="260" rx="180" ry="25" fill="#ffffff" fill-opacity="0.12" />
  <rect x="280" y="270" width="240" height="15" rx="4" fill="#ffffff" fill-opacity="0.2" />
  
  <!-- Ambient Spotlight cones -->
  <polygon points="400,0 220,500 580,500" fill="#ffffff" fill-opacity="0.05" />
  
  <!-- Podium icon -->
  <rect x="385" y="235" width="30" height="40" rx="2" fill="#ffffff" fill-opacity="0.5" />
  <polygon points="380,235 420,235 410,225 390,225" fill="#ffffff" fill-opacity="0.7" />

  <!-- Text -->
  <text x="400" y="440" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="28" font-weight="bold" fill="#ffffff" text-anchor="middle" letter-spacing="1">
    {title.upper()}
  </text>
  <text x="400" y="470" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="14" fill="#93c5fd" text-anchor="middle">
    DRBCCC HINDU COLLEGE (AUTONOMOUS)
  </text>
</svg>'''

venues = [
    ('cunnan-auditorium', '#1e1b4b', '#0f172a', 'Cunnan Auditorium'),
    ('ramanujan-hall', '#0f766e', '#134e4a', 'Ramanujan Conference Hall'),
    ('rjb-hall', '#831843', '#500724', 'RJB Hall'),
    ('cunnan-conference-hall', '#1e3a8a', '#172554', 'Cunnan Conference Hall'),
]

for filename, c1, c2, title in venues:
    svg_path = os.path.join(img_dir, f"{filename}.svg")
    with open(svg_path, 'w', encoding='utf-8') as f:
        f.write(make_venue_svg(title, c1, c2))
    print("Created", svg_path)

print("All venue visuals created!")
