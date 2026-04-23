import { useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
const EMOJI_CATEGORIES = [
    {
        name: "Smileys",
        emojis: [
            "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃",
            "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙",
            "🥲", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫",
            "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬",
            "😮‍💨", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕",
        ],
    },
    {
        name: "Gestures",
        emojis: [
            "👋", "🤚", "🖐", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞",
            "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍",
            "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝",
            "🙏", "✍️", "💅", "🤳", "💪", "🦵", "🦶", "👂", "🦻", "👃",
        ],
    },
    {
        name: "Hearts",
        emojis: [
            "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
            "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "♥️",
        ],
    },
    {
        name: "Objects",
        emojis: [
            "🎁", "🎈", "🎉", "🎊", "🎄", "🎃", "🔥", "✨", "🌟", "⭐",
            "💫", "🌈", "☀️", "🌙", "⚡", "💥", "💢", "💯", "💤", "💬",
            "💭", "🗯️", "💡", "🔔", "🎵", "🎶", "📱", "💻", "🖥️", "📷",
            "📹", "🎥", "📞", "☎️", "📺", "📻", "🎧", "🎤", "🎹", "🎸",
        ],
    },
    {
        name: "Food",
        emojis: [
            "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈",
            "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🍆", "🥑", "🥦",
            "🌭", "🍔", "🍟", "🍕", "🥪", "🌮", "🌯", "🥗", "🍝", "🍜",
            "🍣", "🍤", "🍦", "🍧", "🍨", "🍩", "🍪", "🎂", "🍰", "☕",
        ],
    },
    {
        name: "Animals",
        emojis: [
            "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯",
            "🦁", "🐮", "🐷", "🐸", "🐵", "🙈", "🙉", "🙊", "🐔", "🐧",
            "🐦", "🐤", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄",
            "🐝", "🐛", "🦋", "🐌", "🐞", "🐜", "🦂", "🐢", "🐍", "🦎",
        ],
    },
];
export function EmojiPicker({ children, onSelect }) {
    const [search, setSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState(0);
    const filteredCategories = EMOJI_CATEGORIES.map((category) => (Object.assign(Object.assign({}, category), { emojis: category.emojis.filter((emoji) => search ? emoji.toLowerCase().includes(search.toLowerCase()) : true) }))).filter((category) => category.emojis.length > 0);
    return (<Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80 p-0" side="top" align="end">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"/>
            <Input placeholder="Search emoji..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" data-testid="input-emoji-search"/>
          </div>
        </div>

        <div className="flex border-b px-1 py-1.5 gap-0.5 overflow-x-auto">
          {EMOJI_CATEGORIES.map((category, index) => (<button key={category.name} onClick={() => setSelectedCategory(index)} className={cn("px-2 py-1 text-lg rounded-md transition-colors", selectedCategory === index
                ? "bg-muted"
                : "hover-elevate")} title={category.name} data-testid={`emoji-category-${category.name.toLowerCase()}`}>
              {category.emojis[0]}
            </button>))}
        </div>

        <ScrollArea className="h-[200px]">
          <div className="p-2">
            {!search && (<p className="text-xs text-muted-foreground font-medium px-1 mb-2">
                {EMOJI_CATEGORIES[selectedCategory].name}
              </p>)}
            <div className="grid grid-cols-8 gap-0.5">
              {(search ? filteredCategories : [EMOJI_CATEGORIES[selectedCategory]])
            .flatMap((c) => c.emojis)
            .map((emoji, index) => (<button key={`${emoji}-${index}`} onClick={() => onSelect(emoji)} className="text-xl p-1.5 rounded-md hover-elevate transition-transform" data-testid={`emoji-${emoji}`}>
                    {emoji}
                  </button>))}
            </div>
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>);
}
