import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils'; // Assuming cn utility exists

const ContentRail = ({ title, items, renderItem, className }) => {
    const scrollContainerRef = useRef(null);

    const scroll = (direction) => {
        if (scrollContainerRef.current) {
            const { current } = scrollContainerRef;
            const scrollAmount = direction === 'left' ? -current.offsetWidth / 2 : current.offsetWidth / 2;
            current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    return (
        <div className={cn("py-8 relative group", className)}>
            <h2 className="text-2xl font-bold text-white mb-4 px-4 md:px-12">{title}</h2>

            <div className="relative group/rail">
                {/* Left Arrow */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-black/50 text-white opacity-0 group-hover/rail:opacity-100 transition-opacity disabled:opacity-0 hover:bg-black/70 border-2 border-white/20"
                    onClick={() => scroll('left')}
                >
                    <ChevronLeft className="h-8 w-8" />
                </Button>

                {/* Content Container */}
                <div
                    ref={scrollContainerRef}
                    className="flex overflow-x-auto gap-4 px-4 md:px-12 scrollbar-hide snap-x"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {items.map((item, index) => (
                        <div key={item.id || index} className="flex-none snap-start">
                            {renderItem(item)}
                        </div>
                    ))}
                </div>

                {/* Right Arrow */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-black/50 text-white opacity-0 group-hover/rail:opacity-100 transition-opacity hover:bg-black/70 border-2 border-white/20"
                    onClick={() => scroll('right')}
                >
                    <ChevronRight className="h-8 w-8" />
                </Button>
            </div>
        </div>
    );
};

export default ContentRail;
