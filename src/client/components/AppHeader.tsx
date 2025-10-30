import { OdysseyLogo } from './OdysseyLogo';

export const AppHeader = () => {
  return (
    <header className="w-full py-8 px-4">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-col items-center gap-3">
          {/* Animated Logo SVG */}
          <div className="w-full max-w-md">
            <OdysseyLogo />
          </div>
          
          {/* Subtitle */}
          <p className="text-center text-base md:text-lg text-slate-300 font-light tracking-wide">
            A Reddit-native space mission game
          </p>
        </div>
      </div>
    </header>
  );
};
