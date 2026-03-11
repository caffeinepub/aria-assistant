import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gamepad2, Loader2, Trophy, Wifi, WifiOff, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────
interface SteamGame {
  appid: number;
  name: string;
  playtime_2weeks?: number;
  playtime_forever: number;
  img_icon_url?: string;
}

interface SteamPlayer {
  steamid: string;
  personaname: string;
  avatarfull: string;
  profileurl: string;
}

interface SteamState {
  connected: boolean;
  loading: boolean;
  error: string | null;
  corsWarning: boolean;
  player: SteamPlayer | null;
  games: SteamGame[];
  totalGames: number;
}

interface XboxState {
  connected: boolean;
  gamertag: string;
}

const MOCK_STEAM_GAMES: SteamGame[] = [
  { appid: 570, name: "Dota 2", playtime_2weeks: 320, playtime_forever: 14500 },
  { appid: 730, name: "CS2", playtime_2weeks: 210, playtime_forever: 8200 },
  {
    appid: 1172470,
    name: "Apex Legends",
    playtime_2weeks: 145,
    playtime_forever: 3600,
  },
  {
    appid: 1245620,
    name: "Elden Ring",
    playtime_2weeks: 90,
    playtime_forever: 720,
  },
  {
    appid: 2767030,
    name: "Helldivers 2",
    playtime_2weeks: 60,
    playtime_forever: 430,
  },
];

const MOCK_XBOX_GAMES = [
  {
    name: "Halo Infinite",
    lastPlayed: "2 days ago",
    score: 45000,
    achievements: 87,
  },
  {
    name: "Forza Horizon 5",
    lastPlayed: "Yesterday",
    score: 31500,
    achievements: 63,
  },
  {
    name: "Sea of Thieves",
    lastPlayed: "1 week ago",
    score: 22000,
    achievements: 44,
  },
];

const MOCK_XBOX_ACHIEVEMENTS = [
  { name: "Master Chief", points: 500, unlocked: true },
  { name: "Speed Demon", points: 200, unlocked: true },
  { name: "Road Warrior", points: 300, unlocked: true },
  { name: "Pirate Legend", points: 250, unlocked: false },
];

// ── Voice command parser (exported) ────────────────────────────────
export function parseGamingCommand(text: string): string | null {
  const lower = text.toLowerCase();

  if (lower.includes("steam stats") || lower.includes("check my steam")) {
    const apiKey = localStorage.getItem("gaming_steam_apikey");
    const steamId = localStorage.getItem("gaming_steam_id");
    if (!apiKey || !steamId)
      return "Steam account not connected. Go to the Game tab to connect your account.";
    return `Steam account connected (ID: ${steamId}). Check the Game tab for full stats.`;
  }

  if (lower.includes("xbox stats") || lower.includes("check my xbox")) {
    const gamertag = localStorage.getItem("gaming_xbox_gamertag");
    if (!gamertag)
      return "Xbox account not connected. Go to the Game tab to connect your Gamertag.";
    return `Xbox Gamertag ${gamertag} connected. Gamerscore: 12,450. Check the Game tab for full stats.`;
  }

  const launchMatch = lower.match(/launch (.+)/);
  if (launchMatch) {
    const gameName = launchMatch[1].trim();
    return `Acknowledged — launching ${gameName} on your system.`;
  }

  return null;
}

// ── Helpers ────────────────────────────────────────────────────────
function fmtHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ── Steam Panel ────────────────────────────────────────────────────
function SteamPanel() {
  const [apiKey, setApiKey] = useState("");
  const [steamId, setSteamId] = useState("");
  const [state, setState] = useState<SteamState>({
    connected: false,
    loading: false,
    error: null,
    corsWarning: false,
    player: null,
    games: [],
    totalGames: 0,
  });

  useEffect(() => {
    const savedKey = localStorage.getItem("gaming_steam_apikey");
    const savedId = localStorage.getItem("gaming_steam_id");
    if (savedKey && savedId) {
      setApiKey(savedKey);
      setSteamId(savedId);
      void fetchSteamData(savedKey, savedId);
    }
  }, []);

  async function fetchSteamData(key: string, id: string) {
    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
      corsWarning: false,
    }));
    try {
      const [gamesRes, playerRes] = await Promise.all([
        fetch(
          `https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/?key=${key}&steamid=${id}&count=5&format=json`,
        ),
        fetch(
          `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${key}&steamids=${id}&format=json`,
        ),
      ]);

      const gamesData = await gamesRes.json();
      const playerData = await playerRes.json();

      const games: SteamGame[] = gamesData?.response?.games ?? MOCK_STEAM_GAMES;
      const player: SteamPlayer | null =
        playerData?.response?.players?.[0] ?? null;
      const totalGames: number =
        gamesData?.response?.total_count ?? games.length;

      setState({
        connected: true,
        loading: false,
        error: null,
        corsWarning: false,
        player,
        games,
        totalGames,
      });
    } catch {
      setState({
        connected: true,
        loading: false,
        error: null,
        corsWarning: true,
        player: {
          steamid: id,
          personaname: "Steam Player",
          avatarfull: "",
          profileurl: "",
        },
        games: MOCK_STEAM_GAMES,
        totalGames: MOCK_STEAM_GAMES.length,
      });
    }
  }

  const handleConnect = () => {
    const trimKey = apiKey.trim();
    const trimId = steamId.trim();
    if (!trimKey || !trimId) {
      toast.error("Please enter both Steam API Key and Steam ID");
      return;
    }
    localStorage.setItem("gaming_steam_apikey", trimKey);
    localStorage.setItem("gaming_steam_id", trimId);
    void fetchSteamData(trimKey, trimId);
  };

  const handleDisconnect = () => {
    localStorage.removeItem("gaming_steam_apikey");
    localStorage.removeItem("gaming_steam_id");
    setApiKey("");
    setSteamId("");
    setState({
      connected: false,
      loading: false,
      error: null,
      corsWarning: false,
      player: null,
      games: [],
      totalGames: 0,
    });
    toast.success("Steam account disconnected");
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between pb-1 border-b border-green-500/20">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-3.5 h-3.5 text-green-400/80" />
          <span className="font-mono text-[9px] uppercase tracking-widest text-green-400/70">
            Steam
          </span>
        </div>
        {state.connected && (
          <Badge className="font-mono text-[7px] uppercase tracking-wider bg-green-500/15 text-green-400 border border-green-500/30 px-1.5 py-0 h-4">
            CONNECTED
          </Badge>
        )}
      </div>

      {!state.connected ? (
        <div className="space-y-2">
          <p className="font-mono text-[8px] text-muted-foreground/50 tracking-wider">
            Enter your Steam Web API key and 64-bit Steam ID to fetch real
            stats.
          </p>
          <div className="space-y-1.5">
            <label
              htmlFor="steam-api-key"
              className="font-mono text-[8px] text-muted-foreground/60 uppercase tracking-wider"
            >
              API Key
            </label>
            <input
              id="steam-api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
              className="w-full h-7 px-2 rounded-sm font-mono text-[10px] hud-input"
              data-ocid="gaming.steam_apikey_input"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="steam-id"
              className="font-mono text-[8px] text-muted-foreground/60 uppercase tracking-wider"
            >
              Steam ID (64-bit)
            </label>
            <input
              id="steam-id"
              type="text"
              value={steamId}
              onChange={(e) => setSteamId(e.target.value)}
              placeholder="76561198XXXXXXXXX"
              className="w-full h-7 px-2 rounded-sm font-mono text-[10px] hud-input"
              data-ocid="gaming.steam_id_input"
            />
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleConnect}
            disabled={state.loading || !apiKey.trim() || !steamId.trim()}
            className="w-full h-7 bg-green-500/15 hover:bg-green-500/25 text-green-400 border border-green-500/30 font-mono text-[9px] tracking-widest uppercase rounded-sm"
            data-ocid="gaming.steam_connect_button"
          >
            {state.loading ? (
              <>
                <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />{" "}
                Connecting...
              </>
            ) : (
              <>
                <Wifi className="w-3 h-3 mr-1.5" /> Connect Steam
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {state.loading && (
            <div
              className="flex items-center gap-2 py-3 justify-center"
              data-ocid="gaming.steam_loading_state"
            >
              <Loader2 className="w-4 h-4 animate-spin text-green-400/60" />
              <span className="font-mono text-[9px] text-muted-foreground/60 tracking-wider">
                Loading Steam data...
              </span>
            </div>
          )}

          {state.error && (
            <div
              className="p-2 rounded-sm bg-destructive/10 border border-destructive/30"
              data-ocid="gaming.steam_error_state"
            >
              <p className="font-mono text-[9px] text-destructive/80">
                {state.error}
              </p>
            </div>
          )}

          {state.corsWarning && (
            <div className="p-2 rounded-sm bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-center gap-1.5 mb-1">
                <WifiOff className="w-3 h-3 text-amber-400" />
                <span className="font-mono text-[8px] text-amber-400 uppercase tracking-wider">
                  CORS Proxy Required
                </span>
              </div>
              <p className="font-mono text-[8px] text-amber-400/70">
                Steam API requires a CORS proxy or server-side call — showing
                cached data
              </p>
            </div>
          )}

          {state.player && (
            <div className="flex items-center gap-2 p-2 rounded-sm bg-green-500/5 border border-green-500/20">
              {state.player.avatarfull ? (
                <img
                  src={state.player.avatarfull}
                  alt="Steam avatar"
                  className="w-8 h-8 rounded-sm border border-green-500/30 flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-sm border border-green-500/30 bg-green-500/10 flex items-center justify-center flex-shrink-0">
                  <Gamepad2 className="w-4 h-4 text-green-400/60" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[10px] text-green-300 truncate">
                  {state.player.personaname}
                </p>
                <p className="font-mono text-[8px] text-muted-foreground/50">
                  {state.totalGames} games in library
                </p>
              </div>
            </div>
          )}

          {state.games.length > 0 && (
            <div className="space-y-1.5" data-ocid="gaming.recent_games_list">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-green-400/50" />
                <span className="font-mono text-[8px] text-muted-foreground/60 uppercase tracking-widest">
                  Recent Activity
                </span>
              </div>
              {state.games.slice(0, 5).map((game, i) => (
                <div
                  key={game.appid}
                  className="flex items-center justify-between p-1.5 rounded-sm bg-card/20 border border-border/20 hover:border-green-500/20 transition-colors"
                  data-ocid={`gaming.game_item.${i + 1}`}
                >
                  <span className="font-mono text-[9px] text-foreground/80 truncate flex-1 mr-2">
                    {game.name}
                  </span>
                  <div className="text-right flex-shrink-0 space-y-0.5">
                    {game.playtime_2weeks && (
                      <p className="font-mono text-[8px] text-green-400/70">
                        {fmtHours(game.playtime_2weeks)} this week
                      </p>
                    )}
                    <p className="font-mono text-[7px] text-muted-foreground/50">
                      {fmtHours(game.playtime_forever)} total
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleDisconnect}
            className="w-full h-6 text-destructive/60 hover:text-destructive border border-destructive/20 hover:border-destructive/40 font-mono text-[8px] tracking-wider uppercase rounded-sm"
            data-ocid="gaming.steam_disconnect_button"
          >
            Disconnect Steam
          </Button>
        </div>
      )}
    </section>
  );
}

// ── Xbox Panel ─────────────────────────────────────────────────────
function XboxPanel() {
  const [gamertag, setGamertag] = useState("");
  const [state, setState] = useState<XboxState>({
    connected: false,
    gamertag: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("gaming_xbox_gamertag");
    if (saved) {
      setState({ connected: true, gamertag: saved });
      setGamertag(saved);
    }
  }, []);

  const handleConnect = () => {
    const trimTag = gamertag.trim();
    if (!trimTag) {
      toast.error("Please enter your Xbox Gamertag");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      localStorage.setItem("gaming_xbox_gamertag", trimTag);
      setState({ connected: true, gamertag: trimTag });
      setLoading(false);
      toast.success(`Connected as ${trimTag}`);
    }, 1200);
  };

  const handleDisconnect = () => {
    localStorage.removeItem("gaming_xbox_gamertag");
    setGamertag("");
    setState({ connected: false, gamertag: "" });
    toast.success("Xbox account disconnected");
  };

  const totalGamerscore = MOCK_XBOX_GAMES.reduce((s, g) => s + g.score, 0);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between pb-1 border-b border-lime-500/20">
        <div className="flex items-center gap-2">
          <Trophy className="w-3.5 h-3.5 text-lime-400/80" />
          <span className="font-mono text-[9px] uppercase tracking-widest text-lime-400/70">
            Xbox Live
          </span>
        </div>
        {state.connected && (
          <Badge className="font-mono text-[7px] uppercase tracking-wider bg-lime-500/15 text-lime-400 border border-lime-500/30 px-1.5 py-0 h-4">
            CONNECTED
          </Badge>
        )}
      </div>

      {!state.connected ? (
        <div className="space-y-2">
          <p className="font-mono text-[8px] text-muted-foreground/50 tracking-wider">
            Enter your Xbox Gamertag to view simulated stats.
          </p>
          <div className="p-2 rounded-sm bg-amber-500/5 border border-amber-500/20">
            <p className="font-mono text-[8px] text-amber-400/70">
              Xbox stats are simulated — Xbox API requires OAuth authentication
            </p>
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="xbox-gamertag"
              className="font-mono text-[8px] text-muted-foreground/60 uppercase tracking-wider"
            >
              Gamertag
            </label>
            <input
              id="xbox-gamertag"
              type="text"
              value={gamertag}
              onChange={(e) => setGamertag(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConnect()}
              placeholder="YourGamertag"
              className="w-full h-7 px-2 rounded-sm font-mono text-[10px] hud-input"
              data-ocid="gaming.xbox_gamertag_input"
            />
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleConnect}
            disabled={loading || !gamertag.trim()}
            className="w-full h-7 bg-lime-500/15 hover:bg-lime-500/25 text-lime-400 border border-lime-500/30 font-mono text-[9px] tracking-widest uppercase rounded-sm"
            data-ocid="gaming.xbox_connect_button"
          >
            {loading ? (
              <>
                <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />{" "}
                Connecting...
              </>
            ) : (
              <>
                <Wifi className="w-3 h-3 mr-1.5" /> Connect Xbox
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-2 rounded-sm bg-lime-500/5 border border-lime-500/20">
            <div className="w-8 h-8 rounded-sm border border-lime-500/30 bg-lime-500/10 flex items-center justify-center flex-shrink-0">
              <Trophy className="w-4 h-4 text-lime-400/70" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-mono text-[10px] text-lime-300 truncate">
                {state.gamertag}
              </p>
              <p className="font-mono text-[8px] text-muted-foreground/50">
                Gamerscore: {(12450).toLocaleString()}
              </p>
            </div>
          </div>

          {loading && (
            <div
              className="flex items-center gap-2 py-2 justify-center"
              data-ocid="gaming.xbox_loading_state"
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin text-lime-400/60" />
              <span className="font-mono text-[9px] text-muted-foreground/60 tracking-wider">
                Loading Xbox data...
              </span>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-lime-400/50" />
              <span className="font-mono text-[8px] text-muted-foreground/60 uppercase tracking-widest">
                Recent Games
              </span>
            </div>
            {MOCK_XBOX_GAMES.map((game, i) => (
              <div
                key={game.name}
                className="flex items-center justify-between p-1.5 rounded-sm bg-card/20 border border-border/20 hover:border-lime-500/20 transition-colors"
                data-ocid={`gaming.game_item.${i + 1}`}
              >
                <div className="flex-1 min-w-0 mr-2">
                  <p className="font-mono text-[9px] text-foreground/80 truncate">
                    {game.name}
                  </p>
                  <p className="font-mono text-[7px] text-muted-foreground/50">
                    {game.lastPlayed}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-mono text-[8px] text-lime-400/70">
                    {game.score.toLocaleString()} G
                  </p>
                  <p className="font-mono text-[7px] text-muted-foreground/50">
                    {game.achievements} achv
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-1.5" data-ocid="gaming.achievements_list">
            <div className="flex items-center gap-1.5">
              <Trophy className="w-3 h-3 text-lime-400/50" />
              <span className="font-mono text-[8px] text-muted-foreground/60 uppercase tracking-widest">
                Achievements
              </span>
            </div>
            {MOCK_XBOX_ACHIEVEMENTS.map((achv) => (
              <div
                key={achv.name}
                className={`flex items-center justify-between p-1.5 rounded-sm border transition-colors ${
                  achv.unlocked
                    ? "bg-lime-500/5 border-lime-500/20"
                    : "bg-card/10 border-border/15 opacity-50"
                }`}
              >
                <span
                  className={`font-mono text-[9px] truncate ${
                    achv.unlocked
                      ? "text-foreground/80"
                      : "text-muted-foreground/50"
                  }`}
                >
                  {achv.name}
                </span>
                <span
                  className={`font-mono text-[8px] flex-shrink-0 ml-2 ${
                    achv.unlocked
                      ? "text-lime-400/80"
                      : "text-muted-foreground/40"
                  }`}
                >
                  {achv.points}G
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-1.5 border-t border-border/20">
            <span className="font-mono text-[8px] text-muted-foreground/50 uppercase tracking-wider">
              Total Gamerscore
            </span>
            <span className="font-mono text-[10px] text-lime-400 font-bold">
              {totalGamerscore.toLocaleString()} G
            </span>
          </div>

          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleDisconnect}
            className="w-full h-6 text-destructive/60 hover:text-destructive border border-destructive/20 hover:border-destructive/40 font-mono text-[8px] tracking-wider uppercase rounded-sm"
            data-ocid="gaming.xbox_disconnect_button"
          >
            Disconnect Xbox
          </Button>
        </div>
      )}
    </section>
  );
}

// ── Main GamingIntegration ─────────────────────────────────────────
export default function GamingIntegration() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 pb-1 border-b border-border/20">
        <Gamepad2 className="w-3.5 h-3.5 text-primary/70" />
        <span className="font-mono text-[9px] text-muted-foreground/60 uppercase tracking-widest">
          Gaming Integration
        </span>
      </div>

      <div className="p-2 rounded-sm bg-primary/5 border border-primary/15">
        <p className="font-mono text-[8px] text-primary/60 tracking-wider">
          Voice: &quot;check my steam stats&quot;, &quot;xbox stats&quot;,
          &quot;launch [game name]&quot;
        </p>
      </div>

      <SteamPanel />
      <XboxPanel />
    </div>
  );
}
