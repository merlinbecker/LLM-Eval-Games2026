import { RetroWindow } from "@/components/retro";

export default function NotFound() {
  return (
    <div className="max-w-2xl mx-auto mt-20">
      <RetroWindow title="ERROR 404">
        <div className="p-8 text-center font-display">
          <p className="text-4xl mb-4">404</p>
          <p className="text-xl uppercase">Page Not Found</p>
          <p className="mt-4 text-lg">The requested resource does not exist.</p>
        </div>
      </RetroWindow>
    </div>
  );
}
