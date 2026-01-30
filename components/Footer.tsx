export function Footer() {
  return (
    <footer className="border-t border-black mt-8 py-4 px-4 text-sm text-gray-600">
      <p>
        Fresh $BREAD baked with love – Domestic US only until further notice.
      </p>
      <p className="mt-1">
        Thank you for supporting our tiny bakery. Due to current size restraints
        we are limited to 10 orders per week, shipping orders monday-thursday –{" "}
        <a
          href="https://x.com/breadonbase"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#00c] hover:underline"
        >
          follow
        </a>
      </p>
    </footer>
  );
}
